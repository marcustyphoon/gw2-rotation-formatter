/* eslint-disable no-useless-concat */
/* eslint-disable prefer-template */
/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable react/no-array-index-key */
import '@discretize/gw2-ui-new/dist/default_style.css';
import '@discretize/gw2-ui-new/dist/index.css';
import '@discretize/typeface-menomonia';
import { useEffect, useState } from 'react';
import {
  exportedSection,
  horizontalFlexContainer,
  importedSection,
  outputTextBox,
  settings,
  shorthandBlurb,
  skillTextBox,
  verticalFlexContainer,
} from './App.css';
import { WEAPON_SWAP } from './constants';
import RotationDisplay from './RotationDisplay';
import type {
  dpsReportData,
  generatedRotation,
  generatedSkillCast,
  rotation,
  rotationFormat,
  skillSequence,
  skillTypeDictionary,
  skillTypeDictionaryEntry,
} from './types';

const skillBlacklist = [
  9292, // air
  9433, // geomancy
  9428, // hydromancy
];

const DEFAULT_NAME_LENGTH_PREF = 10;

const DEMO_URL = 'https://dps.report/ulws-20220804-153218_golem';

function App() {
  const [url, setUrl] = useState<string>('');
  const [status, setStatus] = useState<string>('waiting...');
  const [dpsReportData, setDpsReportData] = useState<dpsReportData | undefined>(undefined);

  const [nameLengthPref, setNameLengthPref] = useState<number>(DEFAULT_NAME_LENGTH_PREF);
  const [includeSwaps, setIncludeSwapsPref] = useState<boolean>(true);
  const [includeInstantsPref, setIncludeInstantsPref] = useState<boolean>(false);
  const [includeCancelledPref, setIncludeCancelledPref] = useState<boolean>(true);
  const [splitAutoChainsPref, setSplitAutoChainsPref] = useState<boolean>(true);
  const [noSwapsPref, setNoSwapsPref] = useState<boolean>(false);

  const [skillDictionary, setSkillDictionary] = useState<skillTypeDictionary>({});
  const [rotationUncombined, setRotationUncombined] = useState<rotation>([]);
  const [serializedLogRotation, setSerializedLogRotation] = useState<string>('');

  const [textBox, setTextBox] = useState('');

  useEffect(() => {
    async function fetchData() {
      setStatus('waiting...');
      if (url) {
        try {
          const permalink = url.split('/').slice(-1);
          if (!permalink) return;
          // eslint-disable-next-line no-console
          console.info('loading data from dps.report...');
          const response = await fetch(`https://dps.report/getJson?permalink=${permalink}`);
          const receivedData = await response.json();
          // eslint-disable-next-line no-console
          console.info('got data from dps.report: ', receivedData);

          if (receivedData.error || !Array.isArray(receivedData?.players)) {
            setStatus(JSON.stringify(receivedData, null, 2));
            return;
          }
          setDpsReportData(receivedData);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(e);
          setStatus(String(e));
        }
      }
    }
    fetchData();
  }, [url]);

  useEffect(() => {
    if (dpsReportData) {
      try {
        const playerData = dpsReportData.players.find(
          (player) => player.name === dpsReportData.recordedBy,
        );
        if (!playerData) {
          setStatus('no player data!');
          return;
        }

        const eiSkillDataEntries = playerData.rotation;

        const eiSkillMap = dpsReportData.skillMap;

        const validRawSkillCasts = eiSkillDataEntries
          .flatMap(({ id, skills }) => {
            return skills.map(({ castTime, duration, timeGained }) => {
              return {
                id,
                castTime,
                instant: duration === 0,
                cancelled: timeGained < 0,
              };
            });
          })
          .filter(({ id, cancelled }) => {
            // remove cancelled skills (only autoattacks if preference flipped)
            const { autoAttack } = eiSkillMap[`s${id}`];
            return cancelled === false || (includeCancelledPref && autoAttack === false);
          })
          .filter(({ id, instant }) => {
            // remove 0ms autoattacks (they don't show up as cancelled for some reason)
            const { autoAttack } = eiSkillMap[`s${id}`];
            return (autoAttack && instant) === false;
          })
          .filter(({ id }) => skillBlacklist.includes(id) === false)
          .sort((a, b) => a.castTime - b.castTime);

        const skillTypeDictionary: Record<number, skillTypeDictionaryEntry> = {};
        let autoAttackTypeCounter = 1;
        validRawSkillCasts.forEach(({ id, instant }) => {
          if (skillTypeDictionary[id]) return;

          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { name, autoAttack, isSwap: realIsSwap, canCrit, icon } = eiSkillMap[`s${id}`];

          const isSwap = noSwapsPref ? false : realIsSwap;

          let shortName = '???';
          if (autoAttack) {
            shortName = `auto${autoAttackTypeCounter++}`;
          } else {
            shortName = name
              .replaceAll(':', '')
              .replaceAll('"', '')
              .replaceAll("'", '')
              .replaceAll('!', '')
              .split(' ')
              .filter((str) => str.substring(0, 1) === str.substring(0, 1).toUpperCase())
              .map((str) => str.substring(0, nameLengthPref))
              .join('');
          }

          const hasDuplicateShortName = (nameToTest: string) =>
            Object.values(skillTypeDictionary).some((entry) => entry.shortName === nameToTest);

          if (hasDuplicateShortName(shortName)) {
            let count = 2;
            while (hasDuplicateShortName(`${shortName}${count}`)) {
              count++;
            }
            shortName = `${shortName}${count}`;
          }

          skillTypeDictionary[id] = {
            name,
            id,
            idsSet: new Set([id]),
            isSwap,
            autoAttack,
            instant,
            shortName,
          };
        });
        setSkillDictionary(skillTypeDictionary);

        const skillCasts: skillSequence = validRawSkillCasts.map(({ id, ...rest }) => ({
          id,
          ...rest,
          data: skillTypeDictionary[id],
          count: 1,
        }));

        const skillSequences: skillSequence[] = skillCasts
          .reduce(
            (prev: skillSequence[], cur) => {
              const pushThis = () => {
                const previous = prev.at(-1);
                if (!Array.isArray(previous)) throw new Error('skillSequences reducer error');
                previous.push(cur);
              };
              const endSequence = () => prev.push([]);

              if (cur.data.isSwap || cur.id === WEAPON_SWAP) {
                if (includeSwaps) pushThis();
                endSequence();
              } else {
                pushThis();
              }
              return prev;
            },
            [[]],
          )
          .filter((skillSequence) => skillSequence.length);

        const rotation = skillSequences.map((skillSequence, i) => ({
          label: String(i),
          skillSequence,
        }));

        setRotationUncombined(rotation);

        const combinedSkillSequences = skillSequences.map((skillSequence) =>
          skillSequence
            .map((skillCast) => ({ ...skillCast, count: 1 }))
            .filter(({ instant, id, data: { isSwap } }) => {
              if (isSwap || id === WEAPON_SWAP) return true;
              return !instant || includeInstantsPref;
            })
            .reduce((prev: skillSequence, cur) => {
              const previous = prev.at(-1);
              if (cur.data.autoAttack && previous?.data.autoAttack) {
                previous.count += 1;
                previous.data.idsSet.add(cur.id);
              } else {
                prev.push(cur);
              }
              return prev;
            }, []),
        );

        // eslint-disable-next-line no-console
        console.log('skillTypeDictionary', skillTypeDictionary);

        const rotationCombined = combinedSkillSequences
          .map((skillSequence, i) => ({
            label: String(i),
            skillSequence,
          }))
          .filter(({ skillSequence }) => skillSequence.length);

        const serializedRotation = rotationCombined
          .map(
            ({ skillSequence, label }) =>
              `${label}: ` +
              skillSequence
                .map(({ count, data }) => (count > 1 ? `${count}x ` : '') + data.shortName)
                .join(', '),
          )
          .join('\n\n');

        setSerializedLogRotation(serializedRotation);

        setStatus('loaded rotation');
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        setStatus(String(e));
      }
    }
  }, [
    dpsReportData,
    includeCancelledPref,
    includeInstantsPref,
    includeSwaps,
    nameLengthPref,
    noSwapsPref,
  ]);

  let parsedTextBoxRotation: generatedRotation = [];

  try {
    parsedTextBoxRotation = textBox
      .split('\n')
      .filter(Boolean)
      .map((line, i) => {
        const splitLine = line.split(':');
        const label = splitLine.length > 1 ? splitLine[0].trim() : String(i);
        const skillSequenceString = splitLine.at(-1) ?? '';

        const skillSequence = skillSequenceString
          .split(',')
          .map((str) => str.trim())
          .filter(Boolean)
          .flatMap((str) => {
            let count = 1;
            const splitString = str.split(' ').filter(Boolean);

            if (splitString.length > 1 && Number(splitString[0].trim().replaceAll('x', ''))) {
              count = Number(splitString[0].trim().replaceAll('x', ''));
            }

            const name = splitString.at(-1)?.trim();

            // if the user's string doesn't match, just use it as the ID
            const fallback = [str, undefined] as const;

            const [idString, data] =
              Object.entries(skillDictionary).find(([_, { shortName }]) => shortName === name) ??
              fallback;

            // apparently gw2-ui fails if you give it a string ID... only if it has overrides
            const id = Number(idString);

            const result: generatedSkillCast = { id, data, count };
            return result;
          });

        return {
          label,
          skillSequence,
        };
      });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
  }

  const scFormat: rotationFormat = {
    label: (label) => `## ${label}`,
    weaponSwap: () => '1. [sc:202][/sc]',
    skill: (id) => `[gw2:${id}:skill]`,
    arrow: () => '-->',
  };

  const dtFormat: rotationFormat = {
    label: (label) => `${label}:`,
    weaponSwap: () => '1. swap',
    skill: (id) =>
      skillDictionary[id]?.name
        ? `<Skill name="${skillDictionary[id].name}"/>`
        : `<Skill id="${id}"/>`,
    arrow: () => '-',
  };

  const formatData = (format: rotationFormat) =>
    parsedTextBoxRotation.map(({ label, skillSequence }) => {
      const formattedData = skillSequence.map(({ id, data, count }) => {
        const { isSwap, idsSet } = data ?? { isSwap: false, idsSet: new Set([id]) };
        if (isSwap || id === WEAPON_SWAP) return format.weaponSwap();

        const ids = [...idsSet];

        if (ids.length > 1 && splitAutoChainsPref) {
          const nonChainAutoCount = count % ids.length;
          const chainAutoCount = Math.floor(count / ids.length);

          const result: string[] = [];

          if (chainAutoCount) {
            const allChainSkillsStr = ids
              .map((skillId) => format.skill(skillId))
              .join(` ${format.arrow()} `);
            const chainAutoCountStr = chainAutoCount > 1 ? `${chainAutoCount}x ` : '';
            result.push(`1. ${chainAutoCountStr}${allChainSkillsStr}`);
          }

          if (nonChainAutoCount) {
            const allChainSkillsStr = ids
              .slice(0, nonChainAutoCount)
              .map((skillId) => format.skill(skillId))
              .join(` ${format.arrow()} `);
            result.push(`1. ${allChainSkillsStr}`);
          }

          return result.join('\n');
        }

        const countStr = count > 1 ? `${count}x ` : '';
        return `1. ${countStr}${format.skill(id)}`;
      });

      return format.label(label) + '\n\n' + formattedData.join('\n') + '\n\n';
    });

  const snowCrowsOutput = formatData(scFormat);
  const discretizeOutput = formatData(dtFormat);

  return (
    <div className={verticalFlexContainer}>
      <h2>gw2 rotation formatter</h2>
      <div>import and edit skill rotations and format them for the [SC] and [dT] websites.</div>
      <div>
        (very wip.{' '}
        <a
          href="https://github.com/marcustyphoon/gw2-rotation-formatter"
          target="_blank"
          rel="noreferrer"
        >
          source on github
        </a>
        .)
      </div>
      <div className={settings}>
        <label>
          preferred skillname length for editing:{' '}
          <input
            type="number"
            value={nameLengthPref}
            onChange={(e) => {
              setNameLengthPref(Number(e.target.value) || DEFAULT_NAME_LENGTH_PREF);
            }}
          />
        </label>
        <label>
          include weapon swaps as skills:{' '}
          <input
            type="checkbox"
            checked={includeSwaps}
            onChange={(e) => {
              setIncludeSwapsPref(e.target.checked);
            }}
          />
        </label>
        <label>
          try to include instant cast skills in edit form:{' '}
          <input
            type="checkbox"
            checked={includeInstantsPref}
            onChange={(e) => {
              setIncludeInstantsPref(e.target.checked);
            }}
          />
        </label>
        <label>
          include &quot;cancelled&quot; non auto skills:{' '}
          <input
            type="checkbox"
            checked={includeCancelledPref}
            onChange={(e) => {
              setIncludeCancelledPref(e.target.checked);
            }}
          />
        </label>
        <label>
          count auto chains instead of autos (buggy):{' '}
          <input
            type="checkbox"
            checked={splitAutoChainsPref}
            onChange={(e) => {
              setSplitAutoChainsPref(e.target.checked);
            }}
          />
        </label>
        <label>
          ignore legend/attunement swaps:{' '}
          <input
            type="checkbox"
            checked={noSwapsPref}
            onChange={(e) => {
              setNoSwapsPref(e.target.checked);
            }}
          />
        </label>
        <div>
          <em>(pressing copy again after changing settings is a good idea.)</em>
        </div>
      </div>
      <div className={horizontalFlexContainer}>
        <div className={importedSection}>
          <div className={verticalFlexContainer}>
            <h3>Import Rotation</h3>
            <label>
              enter dps.report url:{' '}
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                }}
              />
            </label>
            <button type="button" onClick={() => setUrl(DEMO_URL)}>
              (load demo)
            </button>
            <div>status: {status}</div>
          </div>
          <RotationDisplay rotation={rotationUncombined} />
        </div>
        <div className={exportedSection}>
          <div className={verticalFlexContainer}>
            <h3>Edit Rotation</h3>
            <label>
              copy imported rotation to editor:
              <button
                id="copybutton"
                type="button"
                onClick={() => setTextBox(serializedLogRotation)}
              >
                click here!
              </button>
            </label>
          </div>
          <div className={shorthandBlurb}>
            <b>regular skills shorthand: </b>
            <div>
              -{' '}
              {Object.values(skillDictionary)
                .filter(({ instant }) => !instant)
                .map(({ shortName }) => shortName)
                .join(', ') || <em>none!</em>}
            </div>
          </div>
          <div className={shorthandBlurb}>
            <b>instant skills shorthand: </b>
            <div>
              -{' '}
              {Object.values(skillDictionary)
                .filter(({ instant }) => instant)
                .map(({ shortName }) => shortName)
                .join(', ') || <em>none!</em>}
            </div>
          </div>
          <textarea
            value={textBox}
            onChange={(e) => setTextBox(e.target.value)}
            className={skillTextBox}
            autoCorrect="off"
          />
          <RotationDisplay
            rotation={parsedTextBoxRotation}
            splitAutoChains={splitAutoChainsPref}
            showInstantsAsInstant={false}
          />
        </div>
      </div>
      <h3>Formatted Output</h3>
      <div className={horizontalFlexContainer}>
        <div>
          Snow Crows website style:
          <pre className={outputTextBox}>{snowCrowsOutput}</pre>
        </div>
        <div>
          Discretize website style (WIP):
          <pre className={outputTextBox}>{discretizeOutput}</pre>
        </div>
      </div>
    </div>
  );
}

export default App;
