---
title: Secure Label Studio
type: guide
tier: all
order: 99
order_enterprise: 99
meta_title: Secure Label Studio
meta_description: About the security and hardening processes used by various Label Studio editions, and how you can configure a more secure data labeling project.
section: "Install & Setup"
---

Label Studio provides many ways to secure access to your data and your deployment architecture.

All application component interactions are encrypted using the TLS protocol.

<div class="enterprise-only">

Role-based access control is only available in Label Studio Enterprise.

</div>

<!--If you need to meet strong privacy regulations, legal requirements, or you want to make a custom installation within your infrastructure or any public cloud (AWS, Google, Azure, etc.), Label Studio Enterprise works on-premises. It is a self-contained version (no Internet connection is required) of the Platform, no data will leave your infrastructure. To make the installation the most accessible, we offer a Docker image.-->

Label Studio establishes secure connections to the web application by enforcing HTTPS and secured cookies.

<div class="opensource-only">

If you're running the open source version in production, restrict access to the Label Studio server.
Restrict access to the server itself by opening only the [required ports](/guide/install.html#Port_requirements) on the server.

</div>

## Secure user access to Label Studio

Secure user access to Label Studio to protect data integrity and allow changes to be performed only by those with access to the system.

Each user must create an account with a password of at least 8 characters, allowing you to track who has access to Label Studio and which actions they perform.

<div class="opensource-only">

You can restrict signup to only those with a link to the signup page, and the invitation link to the signup page can be reset. See [Set up user accounts for Label Studio](/guide/signup.html) for more.

</div>

<div class="enterprise-only">

You can restrict signup to only those with a link to the signup page, and the invitation link to the signup page can be reset. See [Set up user accounts for Label Studio](/guide/manage_users.html#Signup) for more.

</div>

<div class="enterprise-only">

If you're using Label Studio Enterprise, you can further secure user access in many ways:

- Assign specific roles to specific user accounts to set up role-based access control. For more about the different roles and permissions in Label Studio Enterprise, see [Manage access to Label Studio](/guide/manage_users.html).
- Set up organizations, workspaces, and projects to separate projects and data across different groups of users. Users in one organization cannot see the workspaces or projects in other organizations. For more about how to use organizations, workspaces, and projects to secure access, see [Organize projects in Label Studio](/guide/manage_users.html#Roles-and-workspaces).

</div>

## Secure API access to Label Studio

Access to the REST API is restricted by user role and requires an access token that is specific to a user account. Access tokens can be reset at any time from the Label Studio UI or using the API.

## Enable SSRF protection for production environments

When deploying Label Studio into a production environment, set the `SSRF_PROTECTION_ENABLED` environment variable to `true`. 

This variable is disabled by default to support users who are working with data in their local environments. However, it should be enabled in production usage. 


## Secure access to data in Label Studio

Data in Label Studio is stored in one or two places, depending on your deployment configuration.

- Project settings and configuration details are stored in Label Studio's internal database.
- Input data (texts, images, audio files) is hosted by external data storage and provided to the Label Studio by using URI links. The data is not stored in Label Studio directly, the content is retrieved client-side only.
- Project annotations are stored in the internal database, and optionally can be stored in a local file directory, a Redis database, or cloud storage buckets on Amazon Web Services (AWS), Google Cloud Platform (GCP), or Microsoft Azure.

### Secure database access

Label Studio does not permit direct access to the internal databases from the app to prevent SQL injection attacks and other data exfiltration attempts.

Instead, the app uses URIs to access the data stored in the database. These URIs can only be accessed by the Label Studio labeling interface and API because the requests to retrieve the data using those URIs are verified and proxied by Basic Authentication headers.

All specific object properties that are exposed with a REST API are added to an allowlist. The API endpoints can only be accessed with specific HTTP verbs and must be accessed by browser-based clients that implement a proper Cross-Origin Resource Sharing (CORS) policy. API tokens are user-specific and can be reset at any time.

The PostgreSQL database has SSL mode enabled and requires valid certificates.

### Secure access to cloud storages

Each project in Label Studio can be linked to various cloud storage options such as AWS S3, Google Cloud Storage, and others. Users primarily access files from cloud storage through pre-signed URLs generated by Label Studio. You can configure multiple cloud storage connections per project with different credentials to manage data access. Learn how to set up [cloud storage settings](storage).

Combine workspaces, projects, users, and roles. This approach helps configure and secure cloud storage access effectively.

#### Source storage logic and security

Label Studio's cloud storage integration performs two key operations: 
* **Task sync and import**
* **Media file serving**

Below, both are explained from a security perspective.

##### Task synchronization and import

After connecting a storage to a project, you have several options to load tasks into the project. Depending on the option, you need to provide specific permissions:

* **Sync media files** (**LIST** permission required): Storage Sync automatically creates Label Studio tasks based on the file list in your storage when **Treat every bucket object as a source file** is enabled. Label Studio does not read the file content; it simply references the files (e.g., `{"image": "s3://bucket/1.jpg"}`).

* **Sync JSON task files** (**LIST** and **GET** permissions required): Storage Sync reads Label Studio tasks from JSON files in your bucket and loads the entire JSON content into the Label Studio database when "Treat every bucket object as a source file" is enabled.

* **No sync** (**none** permissions required): You can manually import JSON files containing Label Studio tasks and reference storage URIs (e.g., `{"image": "s3://bucket/1.jpg"}`) inside tasks.

##### Media file serving

Once Label Studio tasks are created, users can view and edit tasks in their browsers. To access media stored in your bucket, the following steps occur:

1. **Pre-signed URL Generation**: Label Studio Backend generates pre-signed URLs for files in the storage bucket. This step requires **GET** permission for pre-signed URL generation, but Label Studio does not download your data.

2. **User Browser Downloads**: The user's browser downloads and displays the media when viewing or labeling tasks. This requires the user's browser to access the pre-signed URLs directly.

#### Source storage behind your VPC

!!! warning Google Cloud Storage
    Google Cloud Storage does **not** support IP or VPN restrictions for pre-signed URLs, making this approach infeasible for GCS. As an alternative security measure for GCS, you can use **signed URLs with short lifetimes**.

To ensure maximum security and isolation of your data behind a VPC, only allow access to users within your VPC. To do this, you can use the following technique — especially effective with Label Studio SaaS (Cloud, `app.humansignal.com`) and AWS S3:

1. Set **IP restrictions** for your S3 storage to allow Label Studio to perform task synchronization and generate pre-signed URLs for media file serving. IP restrictions enhance security by ensuring that only trusted networks can access your storage. GET (`s3:GetObject`) and LIST (`s3:ListBucket`) permissions are required. <span class="enterprise-only">The IP ranges for `app.humansignal.com` can be found in the documentation [here](saas#IP-range).</span>

2. **Establish your VPC Connection** between S3 Storage and Users' Browsers:

   Configure your network so that users' browsers can access the S3 bucket securely within your Virtual Private Cloud (VPC). This ensures that data transmission occurs over a private network, enhancing security by preventing exposure to the public internet. Administrators can set up this connection using AWS VPC endpoints or other networking configurations within their infrastructure. 
   
   **Helpful Resources**:
   - [AWS Documentation: VPC Endpoints for Amazon S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/privatelink-interface-endpoints.html)
   - [AWS Documentation: How to Configure VPC Endpoints](https://docs.aws.amazon.com/vpc/latest/privatelink/endpoint-services-overview.html)

<details>
<summary>Bucket Policy Example for S3 storage</summary>

!!! warning
    These example bucket policies explicitly deny access to any requests outside the allowed IP addresses. Even the user that entered the bucket policy can be denied access to the bucket if the user doesn't meet the conditions. Therefore, make sure to review the bucket policy carefully before saving it. If you get accidentally locked out, see [How to regain access to an Amazon S3 bucket](https://repost.aws/knowledge-center/s3-accidentally-denied-access).

Go to your S3 bucket and then **Permissions > Bucket Policy** in the AWS management console. Add the following policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "DenyAccessUnlessFromSaaSIPsForListAndGet",
            "Effect": "Deny",
            "Principal": {
                "AWS": "arn:aws:iam::490065312183:user/rw_bucket"
            },
            "Action": [
                "s3:ListBucket",
                "s3:GetObject"
            ],
            "Resource": [
                "arn:aws:s3:::YOUR_BUCKET_NAME",
                "arn:aws:s3:::YOUR_BUCKET_NAME/*"
            ],
            "Condition": {
                "NotIpAddress": {
                    "aws:SourceIp": [
                      //// IP ranges for app.humansignal.com from the documentation
                        "x.x.x.x/32",
                        "x.x.x.x/32",
                        "x.x.x.x/32"
                    ]
                }
            }
        },
//// Optional
        {
            "Sid": "DenyAccessUnlessFromVPNForGetObject",
            "Effect": "Deny",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*",
            "Condition": {
                "NotIpAddress": {
                    "aws:SourceIp": "YOUR_VPN_SUBNET/32"
                }
            }
        }
    ]
}
```
</details>

<i>This image shows how you can securely configure source cloud storages with Label Studio using your VPC and IP restrictions</i> 

<img width="49%" style="display: inline-block; margin-right: 5px;" src="/images/storages/cloud-storage-ip-restriction.jpg" alt="Label Studio + Cloud Storage IP Restriction" class="make-intense-zoom" />

<img width="49%" style="display: inline-block;" src="/images/storages/cloud-storage-vpn.jpg" alt="Label Studio + Cloud Storage VPC" class="make-intense-zoom" />

#### Additional Notes

**Google ADC**: If you use Label Studio on-premises with Google Cloud Storage, you can set up [Application Default Credentials](https://cloud.google.com/docs/authentication/provide-credentials-adc) to provide cloud storage authentication globally for all projects, so users do not need to configure credentials manually.

**AWS S3 IAM**: In Label Studio Enterprise, you can use an IAM role configured with an external ID to access S3 bucket contents securely. An 'external ID' is a unique identifier that enhances security by ensuring that only trusted entities can assume the role, reducing the risk of unauthorized access. <span class="enterprise-only">See [Set up an S3 connection with IAM role access](storage#Set-up-an-S3-connection-with-IAM-role-access)</span>

**Storage Regions**: To minimize latency and improve efficiency, store data in cloud storage buckets that are geographically closer to your team rather than near the Label Studio server.

!!! note More details on Cloud Storages
    See more details on [Source storage Sync and URI resolving](storage#Source-storage-Sync-and-URI-resolving). 

### Secure access to Redis storage

If you use Redis as an external storage database for data and annotations, the setup supports TLS/SSL and requires the Label Studio client to be authenticated to the database with a valid certificate.

<div class="enterprise-only">

## Audit logging

Label Studio Enterprise automatically logs all user activities so that you can monitor the activities being performed in the application.

</div>

## Information collected by Label Studio

Label Studio collects usage statistics including the number of page visits, number of annotations, and data types being used in labeling configurations that you set up. The information we collect helps us improve the experience of labeling data in Label Studio and helps us plan future data types and labeling configurations to support.

<div class="opensource-only">

You can disable data collection by setting the environment variable `COLLECT_ANALYTICS` to `False`. 

</div>

## Add self-signed certificate to trusted root store

<div class="code-tabs">
  <div data-name="Docker Compose">

1. Mount your self-signed certificate as a volume into `app` container:

```yaml
volumes:
  - ./my.cert:/tmp/my.cert:ro
```
2. Add environment variable with the name `CUSTOM_CA_CERTS` mentioning all certificates in comma-separated way that should be added into trust store:

```yaml
CUSTOM_CA_CERTS=/tmp/my.cert
```
  </div>

  <div data-name="Kubernetes">

1. Upload your self-signed certificate as a k8s secret.
   Upload `my.cert` as a secrets with a name `test-my-root-cert`:
   
```yaml
kubectl create secret generic test-my-root-cert --from-file=file=my.cert
```

2. Add volumes into your values.yaml file and mention them in `.global.customCaCerts`:

```yaml
global:
  customCaCerts:
   - /opt/heartex/secrets/ca_certs/file/file

app:
  extraVolumes:
    - name: foo
      secret:
        secretName: test-my-root-cert
  extraVolumeMounts:
    - name: foo
      mountPath: "/opt/heartex/secrets/ca_certs/file"
      readOnly: true

rqworker:
  extraVolumes:
    - name: foo
      secret:
        secretName: test-my-root-cert
  extraVolumeMounts:
    - name: foo
      mountPath: "/opt/heartex/secrets/ca_certs/file"
      readOnly: true
```
  </div>
</div>


### Add self-signed certificate to trusted root store for S3 storage

Boto library is used to connect to cloud storage S3. `AWS_CA_BUNDLE` has to be set as environment variable.
<div class="code-tabs">
  <div data-name="Docker Compose">

1. Mount your self-signed certificate as a volume into `app` container: (has to be .pem file type)

```yaml
volumes:
  - ./ca.pem:/tmp/ca.pem:ro
```
2. Add environment variable with the name `AWS_CA_BUNDLE` to be trusted by boto library.

```yaml
AWS_CA_BUNDLE=/tmp/ca.pem
```
