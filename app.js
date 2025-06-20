"use strict";

const OPENAI_API_KEY = '';

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const app = document.getElementById('app');
let journey = null;

function saveCurrentJourney() {
  localStorage.setItem('currentJourney', JSON.stringify(journey));
}

function loadCurrentJourney() {
  const data = localStorage.getItem('currentJourney');
  if (data) {
    journey = JSON.parse(data);
    return true;
  }
  return false;
}

function removeCurrentJourney() {
  localStorage.removeItem('currentJourney');
}

function renderConfig() {
  app.innerHTML = `
  <form id="config-form">
    <label>Location<input type="text" name="location" required></label><br>
    <button type="button" id="use-location">Use my location</button><br>
    <label>Interests (comma separated)<input type="text" name="interests"></label><br>
    <label>Theme<input type="text" name="theme"></label><br>
    <label>Time Window<input type="text" name="time"></label><br>
    <label>Difficulty
      <select name="difficulty">
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
      </select>
    </label><br>
    <button type="button" id="surprise">Surprise Me!</button>
    <button type="submit">Start Journey</button>
  </form>
  <button id="archive-btn">View Past Journeys</button>`;
  document.getElementById('use-location').onclick = getCurrentLocation;
  document.getElementById('surprise').onclick = surpriseMe;
  document.getElementById('archive-btn').onclick = renderArchive;
  document.getElementById('config-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const config = {
      location: form.get('location'),
      interests: form.get('interests'),
      theme: form.get('theme'),
      time: form.get('time'),
      difficulty: form.get('difficulty')
    };
    const quests = await generateQuests(config);
    journey = { config, quests, current: 0, hints: [], evidence: {} };
    saveCurrentJourney();
    renderJourney();
  };
}

function surpriseMe() {
  const locations = [
    'Paris, France',
    'London, UK',
    'New York, USA',
    'Tokyo, Japan'
  ];
  const interests = [
    'Hidden Histories',
    'Street Art',
    'Cafes',
    'Nature',
    'Architecture',
    'Museums'
  ];
  const themes = ['Enigma Expedition', 'Flavor Seeker', 'Urban Explorer'];
  const times = ['30 min', '1 hour', '2 hours'];
  const difficulties = ['easy', 'medium', 'hard'];

  document.querySelector('[name=location]').value = randomChoice(locations);
  const selected = [];
  while (selected.length < 3) {
    const item = randomChoice(interests);
    if (!selected.includes(item)) selected.push(item);
  }
  document.querySelector('[name=interests]').value = selected.join(', ');
  document.querySelector('[name=theme]').value = randomChoice(themes);
  document.querySelector('[name=time]').value = randomChoice(times);
  document.querySelector('[name=difficulty]').value = randomChoice(difficulties);
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getCurrentLocation() {
  navigator.geolocation.getCurrentPosition(async ({ coords }) => {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`);
    const data = await res.json();
    document.querySelector('[name=location]').value = data.display_name;
  }, (err) => alert('Unable to get location'));
}

async function generateQuests(config) {
  const prompt = `Create three short quests for a journey. Return JSON array with title and description. Location: ${config.location}. Interests: ${config.interests}. Theme: ${config.theme}. Difficulty: ${config.difficulty}.`;
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      })
    });
    const data = await res.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (err) {
    alert('Failed to generate quests.');
    return [];
  }
}

async function generateHint(quest, usedHints) {
  const prompt = `Provide a hint (${usedHints + 1}) for the following quest: ${quest.description}`;
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      })
    });
    const data = await res.json();
    return data.choices[0].message.content.trim();
  } catch (err) {
    alert('Failed to generate hint.');
    return '';
  }
}

function formatJourneySummary(j) {
  const header = `Tiny Journey at ${j.config.location}`;
  const quests = j.quests
    .map((q, i) => `Quest ${i + 1}: ${q.title} - ${q.description}`)
    .join('\n');
  return `${header}\n${quests}`;
}

function renderJourney() {
  const quest = journey.quests[journey.current];
  if (!quest) {
    completeJourney();
    return;
  }
  app.innerHTML = `
  <div class="quest">
    <h2>${quest.title}</h2>
    <p>${quest.description}</p>
    <div id="hints"></div>
    <input type="file" id="photo" accept="image/*"><br>
    <input type="text" id="caption" placeholder="Caption (optional)"><br>
    <button id="hint-btn">Hint</button>
    <button id="complete-btn">Complete</button>
  </div>`;
  document.getElementById('hint-btn').onclick = async () => {
    const hints = journey.hints[journey.current] || [];
    if (hints.length >= 3) return;
    const hint = await generateHint(quest, hints.length);
    hints.push(hint);
    journey.hints[journey.current] = hints;
    saveCurrentJourney();
    document.getElementById('hints').innerHTML = hints.map(h => `<p>${h}</p>`).join('');
  };
  document.getElementById('complete-btn').onclick = async () => {
    const file = document.getElementById('photo').files[0];
    const caption = document.getElementById('caption').value;
    let img = null;
    if (file) {
      img = await readFileAsDataURL(file);
    }
    journey.evidence[journey.current] = { img, caption };
    journey.current += 1;
    saveCurrentJourney();
    renderJourney();
  };
  if (journey.hints[journey.current]) {
    document.getElementById('hints').innerHTML = journey.hints[journey.current].map(h => `<p>${h}</p>`).join('');
  }
}

function completeJourney() {
  removeCurrentJourney();
  const past = JSON.parse(localStorage.getItem('pastJourneys') || '[]');
  past.push(journey);
  localStorage.setItem('pastJourneys', JSON.stringify(past));
  const journal = Object.values(journey.evidence)
    .map(e => {
      if (!e) return '';
      const img = e.img ? `<img src="${e.img}" alt="evidence" width="100">` : '';
      const cap = e.caption ? `<p>${e.caption}</p>` : '';
      return `<div class="evidence">${img}${cap}</div>`;
    })
    .join('');
  app.innerHTML = `<h2>Journey Completed!</h2>${journal}<button id="share-btn">Copy Summary</button><button id="restart">Start New Journey</button><button id="view-archive">View Past Journeys</button>`;
  document.getElementById('restart').onclick = () => {
    journey = null;
    renderConfig();
  };
  document.getElementById('view-archive').onclick = renderArchive;
  document.getElementById('share-btn').onclick = () => {
    const summary = formatJourneySummary(journey);
    navigator.clipboard.writeText(summary).then(() => {
      alert('Journey summary copied!');
    });
  };
}

function renderArchive() {
  const past = JSON.parse(localStorage.getItem('pastJourneys') || '[]');
  if (!past.length) {
    app.innerHTML = '<p>No past journeys.</p><button id="home">Home</button>';
  } else {
    app.innerHTML = '<h2>Past Journeys</h2><div id="list"></div><button id="home">Home</button>';
    const list = document.getElementById('list');
    list.innerHTML = past
      .map((j, i) => {
        const title = j.config.location || 'Journey ' + (i + 1);
        const evid = Object.values(j.evidence || {})
          .map(e => e && e.img ? `<img src="${e.img}" width="80">` : '')
          .join('');
        return `<div class="past" data-index="${i}"><h3>${title}</h3>${evid}</div>`;
      })
      .join('');
    list.querySelectorAll('.past').forEach(el => {
      el.onclick = () => renderPastJourney(parseInt(el.dataset.index, 10));
    });
  }
  document.getElementById('home').onclick = () => {
    journey = null;
    renderConfig();
  };
}

function renderPastJourney(index) {
  const past = JSON.parse(localStorage.getItem('pastJourneys') || '[]');
  const j = past[index];
  if (!j) { renderArchive(); return; }
  const journal = Object.values(j.evidence || {})
    .map(e => {
      if (!e) return '';
      const img = e.img ? `<img src="${e.img}" alt="evidence" width="100">` : '';
      const cap = e.caption ? `<p>${e.caption}</p>` : '';
      return `<div class="evidence">${img}${cap}</div>`;
    })
    .join('');
  app.innerHTML = `<h2>Past Journey</h2>${journal}<button id="back">Back</button>`;
  document.getElementById('back').onclick = renderArchive;
}

if (!loadCurrentJourney()) {
  renderConfig();
} else {
  renderJourney();
}
