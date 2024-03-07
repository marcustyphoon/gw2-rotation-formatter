import { globalStyle, style } from '@vanilla-extract/css';

globalStyle('#root', {
  width: '100%',
  padding: '1.5em',
  boxSizing: 'border-box',
});

export const verticalFlexContainer = style(
  {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    rowGap: '1em',
  },
  'container',
);

export const settings = style(
  {
    outline: '1px solid grey',
    display: 'flex',
    flexDirection: 'column',
    padding: '0.5em',
    borderRadius: '0.5em',
  },
  'settings',
);

export const horizontalFlexContainer = style(
  {
    display: 'flex',
    width: '100%',
    columnGap: '1em',
  },
  'horizontalFlexContainer',
);
globalStyle(`${horizontalFlexContainer} > *`, {
  flex: 1,
  minWidth: 0,
});

export const importedSection = style(
  {
    display: 'flex',
    flexDirection: 'column',
  },
  'importedRotation',
);

export const exportedSection = style(
  {
    display: 'flex',
    flexDirection: 'column',
  },
  'exportedRotation',
);

export const shorthandBlurb = style({ margin: '0.5em' }, 'shorthandBlurb');

export const skillTextBox = style(
  {
    resize: 'vertical',
    height: '200px',
    margin: '0.5em',
  },
  'skillTextBox',
);

export const disabledSkillTextBox = style(
  {
    resize: 'vertical',
    height: '1em',
    margin: '0.5em',
  },
  'skillTextBox',
);

export const outputTextBox = style(
  {
    padding: '0.5em',
    minHeight: '200px',
    maxHeight: '600px',
    outline: '1px solid grey',
    overflow: 'scroll',
    userSelect: 'all',
  },
  'outputTextBox',
);

export const a = style({});
