import { globalStyle, style } from '@vanilla-extract/css';

export const container = style(
  {
    maxWidth: '1280px',
    display: 'flex',
    flexDirection: 'column',
    rowGap: '25px',
    fontSize: '25px',
  },
  'container',
);

export const row = style(
  {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    minHeight: '40px',
  },
  'row',
);

export const cancelledSkill = style({ border: '2px solid red' }, 'cancelledSkill');
