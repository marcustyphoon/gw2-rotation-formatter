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

function RotationDisplay({ skillCasts, showInstantsAsInstant = true }) {
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
      {skillCasts.map(({ data, label }, rowIndex) => (
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
          {data.map(({ id, isSwap, autoAttack, duration, cancelled, count = 1 }, skillIndex) => {
            let content = '';
            const cancelledStyle = cancelled ? { border: '2px solid red' } : {};

            if (isSwap || id === WEAPON_SWAP) {
              content = <div style={{ fontSize: autoAttack ? '0.7em' : '1em' }}>-</div>;
            } else if (duration === 0 && showInstantsAsInstant) {
              content = (
                <div style={{ width: 0 }}>
                  <div
                    style={{
                      position: 'relative',
                      top: '20px',
                      fontSize: autoAttack ? '0.7em' : '1em',
                    }}
                  >
                    <Skill id={id} disableText />
                  </div>
                </div>
              );
            } else {
              content = (
                <div style={{ fontSize: autoAttack ? '0.7em' : '1em' }}>
                  <Skill id={id} disableText style={cancelledStyle} />
                </div>
              );
            }

            return Array(count)
              .fill()
              .map((_, innerSkillIndex) => (
                <Fragment key={`${skillIndex}-${innerSkillIndex}`}>{content}</Fragment>
              ));
          })}
        </div>
      ))}
    </div>
  );
}

function App() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('');
  const [skillCasts, setSkillCasts] = useState([]);

  const [nameLength, setNameLength] = useState(7);
  const [includeInstants, setIncludeInstants] = useState(false);
  const [includeCancelledNonAutos, setIncludeCancelledNonAutos] = useState(true);

  const [nameDictionary, setNameDictionary] = useState(new Map());

  const [textBoxCopyable, setTextBoxCopyable] = useState('');

  const [textBox, setTextBox] = useState('');

  useEffect(() => {
    async function fetchData() {
      setStatus('');
      if (url) {
        try {
          const permalink = url.split('/').slice(-1);
          if (!permalink) return;
          // eslint-disable-next-line no-console
          console.log('loading data from dps.report...');
          const response = await fetch(`https://dps.report/getJson?permalink=${permalink}`);
          const dpsReportData = await response.json();
          // eslint-disable-next-line no-console
          console.log('got data from dps.report: ', dpsReportData);

          if (dpsReportData.error || !Array.isArray(dpsReportData?.players)) {
            setStatus(JSON.stringify(dpsReportData, null, 2));
            return;
          }

          const playerData = dpsReportData.players.find(
            (player) => player.name === dpsReportData.recordedBy,
          );

          if (!playerData) {
            setStatus('no player data!');
            return;
          }

          const { rotation: rotationDataSkillEntries } = playerData;

          const { skillMap } = dpsReportData;

          const allSkillCasts = rotationDataSkillEntries
            .flatMap(({ id, skills }) => {
              return skills.map(({ castTime, duration, timeGained, quickness }) => {
                const { name, autoAttack, canCrit, isSwap, icon } = skillMap[`s${id}`];
                return {
                  id,
                  name,
                  autoAttack,
                  canCrit,
                  isSwap,
                  icon,
                  castTime,
                  duration,
                  timeGained,
                  cancelled: timeGained < 0,
                  quickness,
                  count: 1,
                };
              });
            })
            .filter(({ autoAttack, cancelled }) => {
              return cancelled === false || (includeCancelledNonAutos && autoAttack === false);
            })
            .filter(({ id }) => skillBlacklist.includes(id) === false)
            .sort((a, b) => a.castTime - b.castTime);

          const skillCastsByWeapon = allSkillCasts
            .reduce(
              (prev, cur) => {
                if (cur.isSwap || cur.id === WEAPON_SWAP) {
                  prev.push([]);
                } else {
                  prev.at(-1).push(cur);
                }
                return prev;
              },
              [[]],
            )
            .filter((arr) => arr.length)
            .map((arr, i) => ({
              label: i,
              data: arr,
            }));

          setStatus('loaded rotation');
          setSkillCasts(skillCastsByWeapon);

          const dictionary = new Map();

          let autoAttackCounter = 1;

          allSkillCasts.forEach(({ id, name, isSwap, autoAttack, duration }) => {
            if (isSwap || id === WEAPON_SWAP) return;
            if (dictionary.has(id)) return;

            let shortName = '???';
            if (autoAttack) {
              shortName = `auto${autoAttackCounter++}`;
            } else {
              shortName = name
                .replaceAll(':', '')
                .replaceAll('"', '')
                .replaceAll("'", '')
                .replaceAll('!', '')
                .split(' ')
                .filter((str) => str.substring(0, 1) === str.substring(0, 1).toUpperCase())
                .map((str) => str.substring(0, nameLength))
                .join('');
            }

            const dictionaryHasDuplicateName = (nameToTest) =>
              [...dictionary.values()].filter(
                ({ shortName: entryShortName }) => entryShortName === nameToTest,
              ).length;

            if (dictionaryHasDuplicateName(shortName)) {
              let count = 2;
              while (dictionaryHasDuplicateName(`${shortName}${count}`)) {
                count++;
              }
              shortName = `${shortName}${count}`;
            }

            dictionary.set(id, { id, isSwap, autoAttack, duration, shortName });
          });

          setNameDictionary(dictionary);

          const skillCastsByWeaponCombinedAutoattacks = skillCastsByWeapon
            .map(({ data, label }) => {
              const newData = data
                .filter(({ duration }) => duration !== 0 || includeInstants)
                .reduce((prev, cur) => {
                  if (cur.autoAttack && prev.at(-1)?.autoAttack) {
                    prev.at(-1).count += 1;
                  } else {
                    prev.push({ ...cur });
                  }
                  return prev;
                }, []);
              return { data: newData, label };
            })
            .filter(({ data }) => data.length);

          const formatted = skillCastsByWeaponCombinedAutoattacks
            .map(
              ({ data, label }) =>
                `${label}: ` +
                data
                  .map(
                    ({ id, count }) =>
                      (count > 1 ? `${count}x ` : '') + dictionary.get(id).shortName,
                  )
                  .join(', '),
            )
            .join('\n\n');

          setTextBoxCopyable(formatted);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(e);
          setStatus(String(e));
        }
      }
    }
    fetchData();
  }, [url, nameLength, includeInstants, includeCancelledNonAutos]);

  let parsedTextBox = [];

  try {
    parsedTextBox = textBox
      .split('\n')
      .filter(Boolean)
      .map((line, i) => {
        const splitLine = line.split(':');
        const label = splitLine.length > 1 ? splitLine.at(0).trim() : i;
        const strippedLine = splitLine.at(-1);

        return {
          label,
          data: strippedLine
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

              const foundData = [...nameDictionary.entries()].find(
                ([_, { shortName }]) => shortName === name,
              )?.[1] ?? { id: str };

              return { ...foundData, count };
            }),
        };
      });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
  }

  const snowCrowsOutput = parsedTextBox.map(({ label, data }) => {
    const formattedData = data.map(({ id, isSwap, count }) => {
      if (isSwap || id === WEAPON_SWAP) return '1. [sc:202][/sc]';
      if (count > 1) return `1. ${count}x [gw2:${id}:skill]`;
      return `1. [gw2:${id}:skill]`;
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
      <div>(very wip)</div>
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
            value={nameLength}
            onChange={(e) => {
              setNameLength(e.target.value);
            }}
          />
        </label>
        <label>
          try to include instant cast skills in edit form:{' '}
          <input
            type="checkbox"
            checked={includeInstants}
            onChange={(e) => {
              setIncludeInstants(e.target.checked);
            }}
          />
        </label>
        <label>
          include &quot;cancelled&quot; non auto skills:{' '}
          <input
            type="checkbox"
            checked={includeCancelledNonAutos}
            onChange={(e) => {
              setIncludeCancelledNonAutos(e.target.checked);
            }}
          />
        </label>
      </div>
      <div style={{ display: 'flex', width: '100%' }}>
        <div style={{ flex: 1 }}>
          <h3>imported rotation</h3>
          <RotationDisplay skillCasts={skillCasts} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h3>edit rotation</h3>
          <label>
            copy imported rotation to editable form
            <button id="copybutton" type="button" onClick={() => setTextBox(textBoxCopyable)}>
              import!
            </button>
          </label>
          <div>
            <b>regular skills: </b>
            <div>
              {[...nameDictionary.values()]
                .filter(({ duration }) => duration)
                .map(({ shortName }) => shortName)
                .join(', ')}
            </div>
          </div>
          <div>
            <b>instant skills: </b>
            <div>
              {[...nameDictionary.values()]
                .filter(({ duration }) => !duration)
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
          <RotationDisplay skillCasts={parsedTextBox} showInstantsAsInstant={false} />
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
