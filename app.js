const OPENAI_API_KEY = '';

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
    <button type="submit">Start Journey</button>
  </form>`;
  document.getElementById('use-location').onclick = getCurrentLocation;
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
    journey = { config, quests, current: 0, hints: [] };
    saveCurrentJourney();
    renderJourney();
  };
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
  try {
    return JSON.parse(data.choices[0].message.content);
  } catch {
    return [];
  }
}

async function generateHint(quest, usedHints) {
  const prompt = `Provide a hint (${usedHints + 1}) for the following quest: ${quest.description}`;
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
  document.getElementById('complete-btn').onclick = () => {
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
  app.innerHTML = `<h2>Journey Completed!</h2><button id="restart">Start New Journey</button>`;
  document.getElementById('restart').onclick = () => {
    journey = null;
    renderConfig();
  };
}

if (!loadCurrentJourney()) {
  renderConfig();
} else {
  renderJourney();
}
