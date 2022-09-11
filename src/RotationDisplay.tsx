/* eslint-disable react/no-array-index-key */
import { Skill } from '@discretize/gw2-ui-new';
import React, { Fragment } from 'react';
import { WEAPON_SWAP } from './constants';
import {
  info,
  cancelledSkill,
  instantSkill,
  container,
  row,
  rowLabel,
  blockSkill,
} from './RotationDisplay.css';

function BlockSkill({ ...props }) {
  return <Skill className={blockSkill} disableText {...props} />;
}

function RotationSkill({ id, cancelled, count, data, splitAutoChains, showInstantsAsInstant }) {
  const { idsSet, isSwap, autoAttack, instant } = data ?? {
    idsSet: new Set([id]),
    isSwap: false,
    autoAttack: false,
    instant: false,
  };
  let content = '';

  let className;
  if (cancelled) className = cancelledSkill;
  if (instant && !showInstantsAsInstant) className = instantSkill;

  if (isSwap || id === WEAPON_SWAP) {
    content = <div style={{ fontSize: autoAttack ? '0.7em' : '1em' }}>-</div>;
  } else if (instant && showInstantsAsInstant) {
    content = (skillId) => (
      <div style={{ width: 0 }}>
        <div
          className={className}
          style={{
            position: 'relative',
            top: '1em',
            left: '-0.85em',
            fontSize: autoAttack ? '0.7em' : '1em',
          }}
        >
          <BlockSkill id={skillId} />
        </div>
      </div>
    );
  } else if (instant && !showInstantsAsInstant) {
    content = (skillId) => (
      <div
        className={className}
        style={{
          position: 'relative',
          top: '0.5em',
          fontSize: autoAttack ? '0.7em' : '1em',
        }}
      >
        <BlockSkill id={skillId} />
      </div>
    );
  } else {
    content = (skillId) => (
      <div className={className} style={{ fontSize: autoAttack ? '0.7em' : '1em' }}>
        <BlockSkill id={skillId} />
      </div>
    );
  }

  const ids = [...idsSet];

  return Array(count)
    .fill()
    .map((_, i) => (
      <Fragment key={i}>{content(splitAutoChains ? ids[i % ids.length] : id)}</Fragment>
    ));
}
const RotationSkillMemo = React.memo(RotationSkill);

export default function RotationDisplay({
  rotation,
  splitAutoChains = true,
  showInstantsAsInstant = true,
  style = {},
}) {
  const sequence = rotation.map(({ skillSequence, label }, rowIndex) => (
    <div className={row} key={rowIndex}>
      <div className={rowLabel}>{label}: </div>
      {skillSequence.map(({ id, cancelled, count, data }, i) => (
        <RotationSkillMemo
          {...{ id, cancelled, count, data }}
          {...{ splitAutoChains, showInstantsAsInstant }}
          key={i}
        />
      ))}
    </div>
  ));

  const nothing = <div className={info}>No rotation data to display.</div>;

  return (
    <div className={container} style={style}>
      {rotation.length ? sequence : nothing}
    </div>
  );
}
