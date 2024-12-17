# syntax=docker/dockerfile:1
ARG NODE_VERSION=18
ARG PYTHON_VERSION=3.12
ARG POETRY_VERSION=1.8.4
ARG VERSION_OVERRIDE
ARG BRANCH_OVERRIDE

################################ Overview

# This Dockerfile builds a Label Studio environment.
# It consists of three main stages:
# 1. "frontend-builder" - Compiles the frontend assets using Node.
# 2. "frontend-version-generator" - Generates version files for frontend sources.
# 3. "venv-builder" - Prepares the virtualenv environment.
# 4. "py-version-generator" - Generates version files for python sources.
# 5. "prod" - Creates the final production image with the Label Studio, Nginx, and other dependencies.

################################ Stage: frontend-builder (build frontend assets)
FROM --platform=${BUILDPLATFORM} node:${NODE_VERSION} AS frontend-builder
ENV BUILD_NO_SERVER=true \
    BUILD_NO_HASH=true \
    BUILD_NO_CHUNKS=true \
    BUILD_MODULE=true \
    YARN_CACHE_FOLDER=/root/web/.yarn \
    NX_CACHE_DIRECTORY=/root/web/.nx \
    NODE_ENV=production

WORKDIR /label-studio/web

# Fix Docker Arm64 Build
RUN yarn config set registry https://registry.npmjs.org/
RUN yarn config set network-timeout 1200000 # HTTP timeout used when downloading packages, set to 20 minutes

COPY web/package.json .
COPY web/yarn.lock .
COPY web/tools tools
RUN --mount=type=cache,target=${YARN_CACHE_FOLDER},sharing=locked \
    --mount=type=cache,target=${NX_CACHE_DIRECTORY},sharing=locked \
    yarn install --prefer-offline --no-progress --pure-lockfile --frozen-lockfile --ignore-engines --non-interactive --production=false

COPY web .
COPY pyproject.toml ../pyproject.toml
RUN --mount=type=cache,target=${YARN_CACHE_FOLDER},sharing=locked \
    --mount=type=cache,target=${NX_CACHE_DIRECTORY},sharing=locked \
    yarn run build

################################ Stage: frontend-version-generator
FROM frontend-builder AS frontend-version-generator
RUN --mount=type=cache,target=${YARN_CACHE_FOLDER},sharing=locked \
    --mount=type=cache,target=${NX_CACHE_DIRECTORY},sharing=locked \
    --mount=type=bind,source=.git,target=../.git \
    yarn version:libs

################################ Stage: venv-builder (prepare the virtualenv)
FROM python:${PYTHON_VERSION}-slim AS venv-builder
ARG POETRY_VERSION

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=off \
    PIP_DISABLE_PIP_VERSION_CHECK=on \
    PIP_DEFAULT_TIMEOUT=100 \
    PIP_CACHE_DIR="/.cache" \
    POETRY_CACHE_DIR="/.poetry-cache" \
    POETRY_HOME="/opt/poetry" \
    POETRY_VIRTUALENVS_IN_PROJECT=true \
    PATH="/opt/poetry/bin:$PATH"

ADD https://install.python-poetry.org /tmp/install-poetry.py
RUN python /tmp/install-poetry.py

RUN --mount=type=cache,target="/var/cache/apt",sharing=locked \
    --mount=type=cache,target="/var/lib/apt/lists",sharing=locked \
    set -eux; \
    apt-get update; \
    apt-get install --no-install-recommends -y \
            build-essential git; \
    apt-get autoremove -y

WORKDIR /label-studio

ENV VENV_PATH="/label-studio/.venv"
ENV PATH="$VENV_PATH/bin:$PATH"

## Starting from this line all packages will be installed in $VENV_PATH

# Copy dependency files
COPY pyproject.toml poetry.lock README.md ./

# Install dependencies without dev packages
RUN --mount=type=cache,target=$POETRY_CACHE_DIR,sharing=locked \
    poetry check --lock && poetry install --no-root --without test --extras uwsgi

# Install LS
COPY label_studio label_studio
RUN --mount=type=cache,target=$POETRY_CACHE_DIR,sharing=locked \
    # `--extras uwsgi` is mandatory here due to poetry bug: https://github.com/python-poetry/poetry/issues/7302
    poetry install --only-root --extras uwsgi && \
    python3 label_studio/manage.py collectstatic --no-input

################################ Stage: py-version-generator
FROM venv-builder AS py-version-generator
ARG VERSION_OVERRIDE
ARG BRANCH_OVERRIDE

# Create version_.py and ls-version_.py
RUN --mount=type=bind,source=.git,target=./.git \
    VERSION_OVERRIDE=${VERSION_OVERRIDE} BRANCH_OVERRIDE=${BRANCH_OVERRIDE} poetry run python label_studio/core/version.py

################################### Stage: prod
FROM python:${PYTHON_VERSION}-slim AS production

ENV LS_DIR=/label-studio \
    HOME=/label-studio \
    LABEL_STUDIO_BASE_DATA_DIR=/label-studio/data \
    OPT_DIR=/opt/heartex/instance-data/etc \
    PATH="/label-studio/.venv/bin:$PATH" \
    DJANGO_SETTINGS_MODULE=core.settings.label_studio \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR $LS_DIR

# install prerequisites for app
RUN --mount=type=cache,target="/var/cache/apt",sharing=locked \
    --mount=type=cache,target="/var/lib/apt/lists",sharing=locked \
    set -eux; \
    apt-get update; \
    apt-get upgrade -y; \
    apt-get install --no-install-recommends -y libexpat1 \
        gnupg2 curl; \
    apt-get autoremove -y

# install nginx
RUN --mount=type=cache,target="/var/cache/apt",sharing=locked \
    --mount=type=cache,target="/var/lib/apt/lists",sharing=locked \
    set -eux; \
    curl -sSL https://nginx.org/keys/nginx_signing.key | gpg --dearmor -o /etc/apt/keyrings/nginx-archive-keyring.gpg >/dev/null; \
    DEBIAN_VERSION=$(awk -F '=' '/^VERSION_CODENAME=/ {print $2}' /etc/os-release); \
    printf "deb [signed-by=/etc/apt/keyrings/nginx-archive-keyring.gpg] http://nginx.org/packages/debian ${DEBIAN_VERSION} nginx\n" > /etc/apt/sources.list.d/nginx.list; \
    printf "Package: *\nPin: origin nginx.org\nPin: release o=nginx\nPin-Priority: 900\n" > /etc/apt/preferences.d/99nginx; \
    apt-get update; \
    apt-get install --no-install-recommends -y nginx; \
    apt-get autoremove -y

RUN set -eux; \
    mkdir -p $LS_DIR $LABEL_STUDIO_BASE_DATA_DIR $OPT_DIR && \
    chown -R 1001:0 $LS_DIR $LABEL_STUDIO_BASE_DATA_DIR $OPT_DIR /var/log/nginx /etc/nginx

COPY --chown=1001:0 deploy/default.conf /etc/nginx/nginx.conf

# Copy essential files for installing Label Studio and its dependencies
COPY --chown=1001:0 pyproject.toml .
COPY --chown=1001:0 poetry.lock .
COPY --chown=1001:0 README.md .
COPY --chown=1001:0 LICENSE LICENSE
COPY --chown=1001:0 licenses licenses
COPY --chown=1001:0 deploy deploy

# Copy files from build stages
COPY --chown=1001:0 --from=venv-builder               $LS_DIR                                           $LS_DIR
COPY --chown=1001:0 --from=py-version-generator       $LS_DIR/label_studio/core/version_.py             $LS_DIR/label_studio/core/version_.py
COPY --chown=1001:0 --from=frontend-builder           $LS_DIR/web/dist                                  $LS_DIR/web/dist
COPY --chown=1001:0 --from=frontend-version-generator $LS_DIR/web/dist/apps/labelstudio/version.json    $LS_DIR/web/dist/apps/labelstudio/version.json
COPY --chown=1001:0 --from=frontend-version-generator $LS_DIR/web/dist/libs/editor/version.json         $LS_DIR/web/dist/libs/editor/version.json
COPY --chown=1001:0 --from=frontend-version-generator $LS_DIR/web/dist/libs/datamanager/version.json    $LS_DIR/web/dist/libs/datamanager/version.json

USER 1001

EXPOSE 8080

ENTRYPOINT ["./deploy/docker-entrypoint.sh"]
CMD ["label-studio"]
