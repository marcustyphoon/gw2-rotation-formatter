import { globalStyle, style } from '@vanilla-extract/css';

globalStyle('#root', {
  width: '100%',
  margin: '1em',
});

export const container = style(
  {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    rowGap: '0.5em',
  },
  'container',
);

export const settings = style(
  {
    outline: '1px solid grey',
    display: 'flex',
    flexDirection: 'column',
    padding: '0.5em',
  },
  'settings',
);

export const rotationContainer = style({ display: 'flex', width: '100%' }, 'rotationContainer');
export const rotationSection = style({ flex: 1 });

export const importedRotation = style([rotationSection], 'importedRotation');
export const exportedRotation = style([
  rotationSection,
  { display: 'flex', flexDirection: 'column' },
  'exportedRotation',
]);

export const skillTextBox = style({ resize: 'vertical', height: '200px' }, 'skillTextBox');

export const outputTextBox = style(
  {
    width: '500px',
    maxHeight: '500px',
    outline: '1px solid grey',
    overflow: 'scroll',
  },
  'outputTextBox',
);

export const a = style({});
