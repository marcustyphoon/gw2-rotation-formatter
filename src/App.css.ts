import { globalStyle, style } from '@vanilla-extract/css';

globalStyle('#root', {
  width: '100%',
  margin: '1.5em',
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
});

export const importedSection = style({}, 'importedSection');

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

export const outputTextBox = style(
  {
    padding: '0.5em',
    minHeight: '200px',
    maxHeight: '600px',
    outline: '1px solid grey',
    overflow: 'scroll',
    userSelect: 'all',
    whiteSpace: 'pre-wrap',
  },
  'outputTextBox',
);

export const a = style({});
