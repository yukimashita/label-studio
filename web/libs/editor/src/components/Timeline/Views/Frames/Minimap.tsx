import { type FC, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Block, Elem } from "../../../../utils/bem";
import { isDefined } from "../../../../utils/utilities";
import { TimelineContext } from "../../Context";
import { visualizeLifespans } from "./Utils";
import "./Minimap.scss";

export const Minimap: FC<any> = () => {
  const { regions, length } = useContext(TimelineContext);
  const root = useRef<HTMLDivElement>();
  const [step, setStep] = useState(0);
  const [displayEntries, setDisplayEntries] = useState(7);

  if (window.LabelStudioHook === undefined)
    window.LabelStudioHook = {};
  window.LabelStudioHook.Minimap = {
    displayEntries,
    setDisplayEntries
  };

  const visualization = useMemo(() => {
    const selectedIndex = regions.findIndex(r => r.selected);
    const top = Math.max(selectedIndex - 1, 0); // 選択リージョンを2番目に表示
    //const top = Math.max(selectedIndex - displayEntries / 2, 0); // 選択リージョンを中央に表示
    const bottom = Math.min(top + displayEntries, regions.length - 1);
    return regions
      .slice(top, bottom)
      .map(({ id, color, sequence }) => {
      return {
        id,
        color,
        lifespans: visualizeLifespans(sequence, step),
      };
    });
  }, [step, regions, displayEntries]);

  useEffect(() => {
    if (isDefined(root.current) && length > 0) {
      setStep(root.current.clientWidth / length);
    }
  }, [length]);

  return (
    <Block ref={root} name="minimap">
      {visualization.map(({ id, color, lifespans }) => {
        return (
          <Elem key={id} name="region" style={{ "--color": color }}>
            {lifespans.map((connection, i) => {
              const isLast = i + 1 === lifespans.length;
              const left = connection.start * step;
              const width = isLast && connection.enabled ? "100%" : connection.width;

              return <Elem key={`${id}${i}`} name="connection" style={{ left, width }} />;
            })}
          </Elem>
        );
      })}
    </Block>
  );
};
