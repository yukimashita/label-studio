import { FC, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Block, Elem } from '../../../../utils/bem';
import { isDefined } from '../../../../utils/utilities';
import { visualizeLifespans } from './Utils';
import './Minimap.styl';
import { TimelineContext } from '../../Context';

export const Minimap: FC<any> = () => {
  const { regions, length } = useContext(TimelineContext);
  const root = useRef<HTMLDivElement>();
  const [step, setStep] = useState(0);

  const minimapEntries = 16; // # of display regions in Minimap
  const [selectedRegion, setSelectedRegion] = useState(null);
  const selectedRegionIndex = useMemo(() => {
    if (!selectedRegion)
      return 0;
    return Math.max(regions.findIndex(r => r.id === selectedRegion.id), 0);
  }, [selectedRegion]);

  useEffect(() => {
    const index = regions.findIndex(r => r.selected);
    if (index === -1) {
      if (selectedRegion)
        setSelectedRegion(null);
      return;
    }

    const region = regions[index];
    if (region.id !== selectedRegion?.id)
      setSelectedRegion(region);
  }, [regions]);

  const visualization = useMemo(() => {
    let top = Math.max(selectedRegionIndex - 1, 0);
    const n = regions.length - top;
    if (n < minimapEntries)
      top = Math.max(regions.length - minimapEntries, 0);
    return regions
      .slice(top, top + minimapEntries)
      .map(({ id, color, sequence }) => {
        return {
          id,
          color,
          lifespans: visualizeLifespans(sequence, step),
        };
      });
  }, [step, regions, selectedRegionIndex]);

  useEffect(() => {
    if (isDefined(root.current) && length > 0) {
      setStep(root.current.clientWidth / length);
    }
  }, [length]);

  return (
    <Block ref={root} name="minimap">
      {visualization.map(({ id, color, lifespans }) => {
        return (
          <Elem key={id} name="region" style={{ '--color': color }}>
            {lifespans.map((connection, i) => {
              const isLast = i + 1 === lifespans.length;
              const left = connection.start * step;
              const width = (isLast && connection.enabled) ? '100%' : connection.width;

              return (
                <Elem key={`${id}${i}`} name="connection" style={{ left, width }}/>
              );
            })}
          </Elem>
        );
      })}
    </Block>
  );
};
