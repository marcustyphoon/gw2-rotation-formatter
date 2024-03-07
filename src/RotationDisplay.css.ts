import { globalStyle, style } from '@vanilla-extract/css';

export const info = style({ margin: 'auto', color: 'rgb(128, 128, 128)' }, 'info');

const rowHeight = '1.8em';

export const container = style(
  {
    flex: 1,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    borderRadius: '0.5em',
    padding: '0.5em',
    margin: '0.25em',
    maxWidth: '1280px',
    minHeight: '280px',
    display: 'flex',
    flexDirection: 'column',
    rowGap: '1em',
    fontSize: '28px',
  },
  'container',
);

export const row = style(
  {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    minHeight: rowHeight,
  },
  'row',
);
globalStyle(`${row} > *`, {
  height: rowHeight,
  display: 'flex',
  alignItems: 'center',
});

// overrides gw2-ui inline flex
export const blockSkill = style({});
globalStyle(`${blockSkill} > *`, {
  display: 'flex',
});

export const rowLabel = style({ minWidth: '2.5ch', fontSize: '1.2rem' }, 'rowLabel');

export const cancelledSkill = style({}, 'cancelledSkill');
globalStyle(`${cancelledSkill} > *`, {
  border: '2px solid red',
});

export const instantSkill = style({ opacity: 0.65 }, 'instantSkill');
