/* eslint-disable no-useless-concat */
/* eslint-disable prefer-template */
/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable react/no-array-index-key */
import '@discretize/gw2-ui-new/dist/default_style.css';
import '@discretize/gw2-ui-new/dist/index.css';
import '@discretize/typeface-menomonia';
import { useEffect, useState } from 'react';
import {
  verticalFlexContainer,
  importedSection,
  exportedSection,
  shorthandBlurb,
  outputTextBox,
  horizontalFlexContainer,
  settings,
  skillTextBox,
} from './App.css';
import { WEAPON_SWAP } from './constants';
import RotationDisplay from './RotationDisplay';

const skillBlacklist = [
  9292, // air
  9433, // geomancy
  9428, // hydromancy
];

function App() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('waiting...');
  const [dpsReportData, setDpsReportData] = useState(undefined);

  const [nameLengthPref, setNameLengthPref] = useState(10);
  const [includeInstantsPref, setIncludeInstantsPref] = useState(false);
  const [includeCancelledPref, setIncludeCancelledPref] = useState(true);
  const [splitAutoChainsPref, setSplitAutoChainsPref] = useState(true);
  const [noSwapsPref, setNoSwapsPref] = useState(false);

  const [skillDictionary, setSkillDictionary] = useState({});
  const [rotationUncombined, setRotationUncombined] = useState([]);
  const [serializedLogRotation, setSerializedLogRotation] = useState('');

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

        /**
         * @typedef eiSkillCastEntry
         * @type {object}
         * @property {number} castTime
         * @property {number} duration
         * @property {number} timeGained
         * @property {number} quickness
         */
        /**
         * @typedef eiSkillEntry
         * @type {object}
         * @property {number} id
         * @property {eiSkillCastEntry[]} skills
         */
        /** @type {eiSkillEntry[]} */
        const eiSkillDataEntries = playerData.rotation;

        /**
         * @typedef eiSkillMapEntry
         * @type {object}
         * @property {string} name
         * @property {boolean} autoAttack
         * @property {boolean} isSwap
         * @property {boolean} canCrit
         * @property {string} icon
         */
        /** @type {Object.<string, eiSkillMapEntry>} */
        const eiSkillMap = dpsReportData.skillMap;

        /**
         * @typedef rawSkillCast
         * @type {object}
         * @property {number} id
         * @property {number} castTime
         * @property {boolean} instant
         * @property {boolean} cancelled
         */

        /** @type {rawSkillCast[]} */
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

        /**
         * @typedef skillTypeDictionaryEntry
         * @type {object}
         * @property {number} id
         * @property {Set} idsSet
         * @property {boolean} isSwap
         * @property {boolean} autoAttack
         * @property {boolean} instant
         * @property {string} shortName
         */

        /** @type {Object.<number, skillTypeDictionaryEntry>} */
        const skillTypeDictionary = {};
        let autoAttackTypeCounter = 1;
        validRawSkillCasts.forEach(({ id, instant }) => {
          if (skillTypeDictionary[id]) return;

          // eslint-disable-next-line no-unused-vars
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

          const hasDuplicateShortName = (nameToTest) =>
            Object.values(skillTypeDictionary).filter(
              ({ shortName: entryShortName }) => entryShortName === nameToTest,
            ).length;

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

        /**
         * @typedef skillCast
         * @type {object}
         * @property {number} id
         * @property {skillTypeDictionaryEntry?} data
         * @property {number?} castTime
         * @property {boolean?} instant
         * @property {boolean?} cancelled
         * @property {number?} count
         */

        /** @type {skillCast[]} */
        const skillCasts = validRawSkillCasts.map(({ id, ...rest }) => ({
          id,
          ...rest,
          data: skillTypeDictionary[id],
        }));

        /** @type {skillCast[][]} */
        const skillSequences = skillCasts
          .reduce(
            (prev, cur) => {
              if (cur.data.isSwap || cur.id === WEAPON_SWAP) {
                prev.push([]);
              } else {
                prev.at(-1).push(cur);
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

        /** @type {skillCast[][]} */
        const combinedSkillSequences = skillSequences.map((skillSequence) =>
          skillSequence
            .map((skillCast) => ({ ...skillCast, count: 1 }))
            .filter(({ instant }) => !instant || includeInstantsPref)
            .reduce((prev, cur) => {
              if (cur.data.autoAttack && prev.at(-1)?.data.autoAttack) {
                prev.at(-1).count += 1;
                prev.at(-1).data.idsSet.add(cur.id);
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
  }, [dpsReportData, includeCancelledPref, includeInstantsPref, nameLengthPref, noSwapsPref]);

  let parsedTextBoxRotation = [];

  try {
    parsedTextBoxRotation = textBox
      .split('\n')
      .filter(Boolean)
      .map((line, i) => {
        const splitLine = line.split(':');
        const label = splitLine.length > 1 ? splitLine.at(0).trim() : i;
        const skillSequenceString = splitLine.at(-1);

        /** @type {skillCast[]} */
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

            const name = splitString.at(-1).trim();

            // if the user's string doesn't match, just use it as the ID
            const fallback = [str];

            const [idString, data] =
              Object.entries(skillDictionary).find(([_, { shortName }]) => shortName === name) ??
              fallback;

            // apparently gw2-ui fails if you give it a string ID... only if it has overrides
            const id = Number(idString);

            return { id, data, count };
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

  const scFormat = {
    label: (label) => `## ${label}`,
    weaponSwap: () => '1. [sc:202][/sc]',
    skill: (id) => `[gw2:${id}:skill]`,
    arrow: () => '-->',
  };

  const dtFormat = {
    label: (label) => `${label}:`,
    weaponSwap: () => '1. swap',
    skill: (id) =>
      skillDictionary[id]?.name
        ? `<Skill name="${skillDictionary[id].name}"/>`
        : `<Skill id="${id}"/>`,
    arrow: () => '-',
  };

  const formatData = (format) =>
    parsedTextBoxRotation.map(({ label, skillSequence }) => {
      const formattedData = skillSequence.map(({ id, data, count }) => {
        const { isSwap, idsSet } = data ?? { isSwap: false, idsSet: new Set([id]) };
        if (isSwap || id === WEAPON_SWAP) return format.weaponSwap();

        const ids = [...idsSet];

        if (ids.length > 1 && splitAutoChainsPref) {
          const nonChainAutoCount = count % ids.length;
          const chainAutoCount = Math.floor(count / ids.length);

          const result = [];

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
              setNameLengthPref(e.target.value);
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
                onChange={(e) => {
                  setUrl(e.target.value);
                }}
              />
            </label>
            <div>status: {status}</div>
          </div>
          <RotationDisplay style={{ minHeight: '500px' }} rotation={rotationUncombined} />
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