/* eslint-disable no-useless-concat */
/* eslint-disable prefer-template */
/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable react/no-array-index-key */
import { useState, useEffect, Fragment } from 'react';

import './App.css';

import '@discretize/gw2-ui-new/dist/default_style.css';
import '@discretize/gw2-ui-new/dist/index.css';
import '@discretize/typeface-menomonia';

import { Skill } from '@discretize/gw2-ui-new';

const skillBlacklist = [
  9292, // air
  9433, // geomancy
  9428, // hydromancy
];

const WEAPON_SWAP = -2;

function RotationDisplay({ rotation, splitAutoChains = true, showInstantsAsInstant = true }) {
  return (
    <div
      style={{
        maxWidth: '1280px',
        display: 'flex',
        flexDirection: 'column',
        rowGap: '25px',
        fontSize: '25px',
      }}
    >
      {rotation.map(({ skillSequence, label }, rowIndex) => (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            minHeight: '40px',
          }}
          key={rowIndex}
        >
          {label}:
          {skillSequence.map(({ id, cancelled, count, data }, skillIndex) => {
            const { idsSet, isSwap, autoAttack, instant } = data ?? {
              idsSet: new Set([id]),
              isSwap: false,
              autoAttack: false,
              instant: false,
            };
            let content = '';
            const cancelledStyle = cancelled ? { border: '2px solid red' } : {};

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
                  <Skill id={skillId} disableText style={cancelledStyle} />
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

function App() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('waiting...');
  const [dpsReportData, setDpsReportData] = useState(undefined);

  const [nameLengthPref, setNameLengthPref] = useState(7);
  const [includeInstantsPref, setIncludeInstantsPref] = useState(false);
  const [includeCancelledPref, setIncludeCancelledPref] = useState(true);
  const [splitAutoChainsPref, setSplitAutoChainsPref] = useState(false);

  const [skillDictionary, setSkillDictionary] = useState(new Map());
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
            const { autoAttack } = eiSkillMap[`s${id}`];
            return cancelled === false || (includeCancelledPref && autoAttack === false);
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
          const { name, autoAttack, isSwap, canCrit, icon } = eiSkillMap[`s${id}`];

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
  }, [dpsReportData, includeCancelledPref, includeInstantsPref, nameLengthPref]);

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

            const [id, data] =
              Object.entries(skillDictionary).find(([_, { shortName }]) => shortName === name) ??
              fallback;

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

  const snowCrowsOutput = parsedTextBoxRotation.map(({ label, skillSequence }) => {
    const formattedData = skillSequence.map(({ id, data, count }) => {
      const { isSwap, idsSet } = data ?? { isSwap: false, idsSet: new Set([id]) };
      if (isSwap || id === WEAPON_SWAP) return '1. [sc:202][/sc]';

      const ids = [...idsSet];

      if (ids.length > 1 && splitAutoChainsPref) {
        const nonChainAutoCount = count % ids.length;
        const chainAutoCount = Math.floor(count / ids.length);

        const result = [];

        if (chainAutoCount) {
          const allChainSkillsStr = ids.map((skillId) => `[gw2:${skillId}:skill]`).join(' --> ');
          const chainAutoCountStr = chainAutoCount > 1 ? `${count}x ` : '';
          result.push(`1. ${chainAutoCountStr}${allChainSkillsStr}`);
        }

        if (nonChainAutoCount) {
          const allChainSkillsStr = ids
            .slice(0, nonChainAutoCount)
            .map((skillId) => `[gw2:${skillId}:skill]`)
            .join(' --> ');
          result.push(`1. ${allChainSkillsStr}`);
        }

        return result.join('\n');
      }

      const countStr = count > 1 ? `${count}x ` : '';
      return `1. ${countStr}[gw2:${id}:skill]`;
    });

    return `## ${label}` + '\n\n' + formattedData.join('\n') + '\n\n';
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        rowGap: '0.5em',
      }}
    >
      <h2>dps.report to sc site rotation</h2>
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
      <div
        style={{
          outline: '1px solid grey',
          display: 'flex',
          flexDirection: 'column',
          padding: '0.5em',
        }}
      >
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
          count auto chains instead of autos :{' '}
          <input
            type="checkbox"
            checked={splitAutoChainsPref}
            onChange={(e) => {
              setSplitAutoChainsPref(e.target.checked);
            }}
          />
        </label>
      </div>
      <div style={{ display: 'flex', width: '100%' }}>
        <div style={{ flex: 1 }}>
          <h3>imported rotation</h3>
          <RotationDisplay rotation={rotationUncombined} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h3>edit rotation</h3>
          <label>
            copy imported rotation to editable form
            <button id="copybutton" type="button" onClick={() => setTextBox(serializedLogRotation)}>
              import!
            </button>
          </label>
          <div>
            <b>regular skills: </b>
            <div>
              {Object.values(skillDictionary)
                .filter(({ instant }) => !instant)
                .map(({ shortName }) => shortName)
                .join(', ')}
            </div>
          </div>
          <div>
            <b>instant skills: </b>
            <div>
              {Object.values(skillDictionary)
                .filter(({ instant }) => instant)
                .map(({ shortName }) => shortName)
                .join(', ')}
            </div>
          </div>
          <textarea
            value={textBox}
            onChange={(e) => setTextBox(e.target.value)}
            style={{ resize: 'vertical', height: '200px' }}
            autoCorrect="off"
          />
          <RotationDisplay
            rotation={parsedTextBoxRotation}
            splitAutoChains={splitAutoChainsPref}
            showInstantsAsInstant={false}
          />
        </div>
      </div>
      <div>
        <pre
          style={{
            width: '500px',
            maxHeight: '500px',
            outline: '1px solid grey',
            overflow: 'scroll',
          }}
        >
          {snowCrowsOutput}
        </pre>
      </div>
    </div>
  );
}

export default App;