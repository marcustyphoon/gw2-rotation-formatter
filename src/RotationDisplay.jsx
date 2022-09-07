/* eslint-disable react/no-array-index-key */
import { Skill } from '@discretize/gw2-ui-new';
import { Fragment } from 'react';
import { WEAPON_SWAP } from './constants';
import { cancelledSkill, container, row } from './RotationDisplay.css';

export default function RotationDisplay({
  rotation,
  splitAutoChains = true,
  showInstantsAsInstant = true,
}) {
  return (
    <div className={container}>
      {rotation.map(({ skillSequence, label }, rowIndex) => (
        <div className={row} key={rowIndex}>
          {label}:
          {skillSequence.map(({ id, cancelled, count, data }, skillIndex) => {
            const { idsSet, isSwap, autoAttack, instant } = data ?? {
              idsSet: new Set([id]),
              isSwap: false,
              autoAttack: false,
              instant: false,
            };
            let content = '';
            // const cancelledStyle = cancelled ?  : {};

            const className = cancelled ? cancelledSkill : false;

            if (isSwap || id === WEAPON_SWAP) {
              content = <div style={{ fontSize: autoAttack ? '0.7em' : '1em' }}>-</div>;
            } else if (instant && showInstantsAsInstant) {
              content = (skillId) => (
                <div style={{ width: 0 }}>
                  <div
                    style={{
                      position: 'relative',
                      top: '20px',
                      fontSize: autoAttack ? '0.7em' : '1em',
                    }}
                  >
                    <Skill id={skillId} disableText />
                  </div>
                </div>
              );
            } else {
              content = (skillId) => (
                <div style={{ fontSize: autoAttack ? '0.7em' : '1em' }}>
                  <Skill id={skillId} disableText className={className} />
                </div>
              );
            }

            const ids = [...idsSet];

            return Array(count)
              .fill()
              .map((_, innerSkillIndex) => (
                <Fragment key={`${skillIndex}-${innerSkillIndex}`}>
                  {content(splitAutoChains ? ids[innerSkillIndex % ids.length] : id)}
                </Fragment>
              ));
          })}
        </div>
      ))}
    </div>
  );
}
