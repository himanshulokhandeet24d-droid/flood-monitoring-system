const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'database.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Format Date & Time strictly in Asia/Kolkata (+5:30)
// Required format: Time: HH:MM AM/PM | Date: DD-MM-YYYY
function getKolkataDateTime(date = new Date()) {
  try {
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    const formattedTime = timeFormatter.format(date);

    const dateFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    // en-GB outputs DD/MM/YYYY -> convert to DD-MM-YYYY
    const formattedDate = dateFormatter.format(date).replace(/\//g, '-');

    return { formattedTime, formattedDate };
  } catch (err) {
    const utc = date.getTime() + date.getTimezoneOffset() * 60000;
    const kolkata = new Date(utc + 3600000 * 5.5);
    const day = String(kolkata.getDate()).padStart(2, '0');
    const month = String(kolkata.getMonth() + 1).padStart(2, '0');
    const year = kolkata.getFullYear();
    let hours = kolkata.getHours();
    const minutes = String(kolkata.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const formattedHours = String(hours).padStart(2, '0');
    return {
      formattedTime: `${formattedHours}:${minutes} ${ampm}`,
      formattedDate: `${day}-${month}-${year}`
    };
  }
}

// Ensure database directory and initial seed data exist
function ensureDatabase() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    const salt = bcrypt.genSaltSync(10);
    const defaultPasswordHash = bcrypt.hashSync('password123', salt);

    const initialStations = [
      {
        id: 'st-01',
        name: 'Nagpur Main Station (Nag River)',
        district: 'Nagpur',
        lat: 21.1458,
        lon: 79.0882,
        waterLevel: 5,
        rainfall: 'Yes',
        status: 'Safe',
        dangerLevel: 25,
        warningLevel: 15,
        riverBasin: 'Kanhan / Wainganga'
      },
      {
        id: 'st-02',
        name: 'Bhandara Barrage Station',
        district: 'Bhandara',
        lat: 21.1713,
        lon: 79.6545,
        waterLevel: 18,
        rainfall: 'Yes',
        status: 'Warning',
        dangerLevel: 25,
        warningLevel: 15,
        riverBasin: 'Wainganga Basin'
      },
      {
        id: 'st-03',
        name: 'Chandrapur Erai River Gauge',
        district: 'Chandrapur',
        lat: 19.9615,
        lon: 79.2961,
        waterLevel: 28,
        rainfall: 'Yes',
        status: 'Danger',
        dangerLevel: 25,
        warningLevel: 15,
        riverBasin: 'Wardha / Godavari'
      },
      {
        id: 'st-04',
        name: 'Wardha River Telemetry Node',
        district: 'Wardha',
        lat: 20.7453,
        lon: 78.6022,
        waterLevel: 9,
        rainfall: 'No',
        status: 'Safe',
        dangerLevel: 25,
        warningLevel: 15,
        riverBasin: 'Wardha Basin'
      },
      {
        id: 'st-05',
        name: 'Gadchiroli Pranhita Outpost',
        district: 'Gadchiroli',
        lat: 20.1809,
        lon: 79.9937,
        waterLevel: 27,
        rainfall: 'Yes',
        status: 'Danger',
        dangerLevel: 25,
        warningLevel: 15,
        riverBasin: 'Pranhita / Godavari'
      }
    ];

    const initialRecords = [
      {
        id: 'rec_01',
        waterLevel: '5 cm',
        waterLevelValue: 5,
        rainfall: 'Yes',
        district: 'Nagpur',
        time: '10:15 AM',
        date: '05-10-2026',
        status: 'Safe',
        timestamp: Date.now() - 3600000 * 4
      },
      {
        id: 'rec_02',
        waterLevel: '8 cm',
        waterLevelValue: 8,
        rainfall: 'Yes',
        district: 'Nagpur',
        time: '11:00 AM',
        date: '05-10-2026',
        status: 'Safe',
        timestamp: Date.now() - 3600000 * 3
      },
      {
        id: 'rec_03',
        waterLevel: '12 cm',
        waterLevelValue: 12,
        rainfall: 'Yes',
        district: 'Nagpur',
        time: '11:45 AM',
        date: '05-10-2026',
        status: 'Safe',
        timestamp: Date.now() - 3600000 * 2
      },
      {
        id: 'rec_04',
        waterLevel: '19 cm',
        waterLevelValue: 19,
        rainfall: 'Yes',
        district: 'Bhandara',
        time: '12:30 PM',
        date: '05-10-2026',
        status: 'Warning',
        timestamp: Date.now() - 3600000 * 1.5
      },
      {
        id: 'rec_05',
        waterLevel: '26 cm',
        waterLevelValue: 26,
        rainfall: 'Yes',
        district: 'Chandrapur',
        time: '01:10 PM',
        date: '05-10-2026',
        status: 'Danger',
        timestamp: Date.now() - 3600000 * 0.8
      },
      {
        id: 'rec_06',
        waterLevel: '29 cm',
        waterLevelValue: 29,
        rainfall: 'Yes',
        district: 'Gadchiroli',
        time: '01:40 PM',
        date: '05-10-2026',
        status: 'Danger',
        timestamp: Date.now() - 3600000 * 0.3
      }
    ];

    const defaultData = {
      users: [
        {
          id: 'usr_dharini_01',
          name: 'Dharini',
          email: 'dharini@floodmonitor.org',
          passwordHash: defaultPasswordHash,
          createdAt: new Date().toISOString()
        }
      ],
      deviceState: {
        online: false,
        lastSeen: null,
        waterLevel: 5,
        rainfall: 'Yes',
        status: 'Safe',
        district: 'Nagpur',
        lat: 21.1458,
        lon: 79.0882,
        line1: 'Flood Monitoring',
        line2: 'System',
        led: 'OFF',
        buzzerAlert: false,
        thresholds: {
          safe: 15,
          warning: 25,
          danger: 25
        }
      },
      stations: initialStations,
      records: initialRecords
    };

    fs.writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2), 'utf8');
  }
}

function readDb() {
  try {
    ensureDatabase();
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading database:', err);
    return { users: [], deviceState: {}, stations: [], records: [] };
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing database:', err);
    return false;
  }
}

// Compute threshold status based on water level
function evaluateStatus(waterLevel, thresholds = { safe: 15, warning: 25 }) {
  const val = Number(waterLevel);
  if (val <= thresholds.safe) {
    return 'Safe';
  } else if (val <= thresholds.warning) {
    return 'Warning';
  } else {
    return 'Danger';
  }
}

// Check online state (active within last 35 seconds)
function isDeviceOnline(lastSeen) {
  if (!lastSeen) return false;
  const diff = Date.now() - new Date(lastSeen).getTime();
  return diff < 35000;
}

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

// Register
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'All fields (name, email, password) are required.' });
  }

  const db = readDb();
  const existingUser = db.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (existingUser) {
    return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);
  const newUser = {
    id: 'usr_' + Date.now(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  writeDb(db);

  return res.json({
    success: true,
    message: 'Registration successful! You may now log in.',
    user: { id: newUser.id, name: newUser.name, email: newUser.email }
  });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide both email and password.' });
  }

  const db = readDb();
  const user = db.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  const isMatch = bcrypt.compareSync(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  return res.json({
    success: true,
    message: 'Login successful.',
    user: {
      id: user.id,
      name: user.name,
      email: user.email
    }
  });
});

// ==========================================
// IOT TELEMETRY & HARDWARE ROUTES (ESP8266)
// ==========================================

// Endpoint for ESP8266 to POST telemetry data
// Body: { waterLevel: 5, rainfall: "Yes"|"No"|1|0, district?: "Nagpur", lat?: 21.14, lon?: 79.08 }
app.post('/api/telemetry', (req, res) => {
  const { waterLevel, rainfall, district, lat, lon } = req.body;

  const db = readDb();
  const numericLevel = parseFloat(waterLevel) || 0;

  // Normalize rainfall to "Yes" or "No"
  let rainString = 'No';
  if (rainfall === true || rainfall === 'Yes' || rainfall === 'YES' || rainfall === 1 || rainfall === '1') {
    rainString = 'Yes';
  }

  const thresholds = db.deviceState.thresholds || { safe: 15, warning: 25, danger: 25 };
  const status = evaluateStatus(numericLevel, thresholds);
  const isDanger = status === 'Danger';

  const { formattedTime, formattedDate } = getKolkataDateTime();
  const activeDistrict = district || db.deviceState.district || 'Nagpur';

  // Update device state
  db.deviceState.waterLevel = numericLevel;
  db.deviceState.rainfall = rainString;
  db.deviceState.status = status;
  db.deviceState.lastSeen = new Date().toISOString();
  db.deviceState.online = true;
  db.deviceState.buzzerAlert = isDanger;

  if (lat) db.deviceState.lat = parseFloat(lat);
  if (lon) db.deviceState.lon = parseFloat(lon);
  if (district) db.deviceState.district = district;

  // Auto-LED rule: Turn LED ON if Danger, or retain manual state
  if (isDanger) {
    db.deviceState.led = 'ON';
  }

  // Create new saved record
  const newRecord = {
    id: 'rec_' + Date.now(),
    waterLevel: `${numericLevel} cm`,
    waterLevelValue: numericLevel,
    rainfall: rainString,
    district: activeDistrict,
    time: formattedTime,
    date: formattedDate,
    status: status,
    timestamp: Date.now()
  };

  db.records.unshift(newRecord);
  // Keep max 500 records to prevent file bloat
  if (db.records.length > 500) {
    db.records = db.records.slice(0, 500);
  }

  // Also update corresponding station on map if district matches
  const station = db.stations.find(s => s.district.toLowerCase() === activeDistrict.toLowerCase());
  if (station) {
    station.waterLevel = numericLevel;
    station.rainfall = rainString;
    station.status = status;
    station.lastUpdate = formattedTime;
  }

  writeDb(db);

  // Return formatted response for ESP8266 LCD & Actuator sequence
  return res.json({
    success: true,
    status: status,
    waterLevel: numericLevel,
    rainfall: rainString,
    lcd: {
      line1: db.deviceState.line1 || 'Flood Monitoring',
      line2: db.deviceState.line2 || 'System',
      waterText: 'WaterLevel',
      waterVal: `${numericLevel} cm.`,
      statusText: 'Status',
      statusVal: status
    },
    led: db.deviceState.led,
    buzzer: isDanger
  });
});

// Endpoint for ESP8266 or dashboard to poll status
app.get('/api/device/status', (req, res) => {
  const db = readDb();
  const online = isDeviceOnline(db.deviceState.lastSeen);
  db.deviceState.online = online;

  return res.json({
    success: true,
    deviceState: {
      ...db.deviceState,
      online
    }
  });
});

// Update device control settings (LED, thresholds, custom LCD lines)
app.post('/api/device/control', (req, res) => {
  const { led, line1, line2, thresholds } = req.body;
  const db = readDb();

  if (led !== undefined) {
    db.deviceState.led = led === 'ON' ? 'ON' : 'OFF';
  }
  if (line1 !== undefined) {
    db.deviceState.line1 = String(line1).substring(0, 16);
  }
  if (line2 !== undefined) {
    db.deviceState.line2 = String(line2).substring(0, 16);
  }
  if (thresholds) {
    if (thresholds.safe) db.deviceState.thresholds.safe = Number(thresholds.safe);
    if (thresholds.warning) db.deviceState.thresholds.warning = Number(thresholds.warning);
    if (thresholds.danger) db.deviceState.thresholds.danger = Number(thresholds.danger);
  }

  writeDb(db);
  return res.json({ success: true, message: 'Settings updated successfully.', deviceState: db.deviceState });
});

// ==========================================
// DASHBOARD RECORDS, SEARCH & PAGINATION
// ==========================================

// GET /api/records with search & pagination
app.get('/api/records', (req, res) => {
  const db = readDb();
  let filtered = [...db.records];

  const search = (req.query.search || '').trim().toLowerCase();
  if (search) {
    filtered = filtered.filter(rec =>
      rec.district.toLowerCase().includes(search) ||
      rec.waterLevel.toLowerCase().includes(search) ||
      rec.rainfall.toLowerCase().includes(search) ||
      rec.date.toLowerCase().includes(search) ||
      rec.time.toLowerCase().includes(search)
    );
  }

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;

  const startIndex = (page - 1) * limit;
  const paginated = filtered.slice(startIndex, startIndex + limit);

  return res.json({
    success: true,
    records: paginated,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  });
});

// DELETE /api/records/:id
app.delete('/api/records/:id', (req, res) => {
  const recordId = req.params.id;
  const db = readDb();

  const initialCount = db.records.length;
  db.records = db.records.filter(r => r.id !== recordId);

  if (db.records.length === initialCount) {
    return res.status(404).json({ success: false, message: 'Record not found.' });
  }

  writeDb(db);
  return res.json({ success: true, message: 'Record deleted successfully.' });
});

// GET /api/stations for Interactive Map (Tab 3)
app.get('/api/stations', (req, res) => {
  const db = readDb();
  return res.json({
    success: true,
    stations: db.stations,
    hardwareDevice: {
      online: isDeviceOnline(db.deviceState.lastSeen),
      waterLevel: db.deviceState.waterLevel,
      rainfall: db.deviceState.rainfall,
      status: db.deviceState.status,
      district: db.deviceState.district,
      lat: db.deviceState.lat,
      lon: db.deviceState.lon
    }
  });
});

// GET /api/analytics for graphs
app.get('/api/analytics', (req, res) => {
  const db = readDb();
  // Return last 20 records in chronological order for graphs
  const recent = [...db.records].slice(0, 20).reverse();

  const labels = recent.map(r => r.time);
  const waterLevels = recent.map(r => r.waterLevelValue || parseFloat(r.waterLevel));
  const rainfalls = recent.map(r => (r.rainfall === 'Yes' ? 1 : 0));
  const districts = recent.map(r => r.district);

  return res.json({
    success: true,
    labels,
    waterLevels,
    rainfalls,
    districts,
    thresholds: db.deviceState.thresholds || { safe: 15, warning: 25, danger: 25 }
  });
});

// Simulation endpoint for manual testing (water level slider, rain toggle)
app.post('/api/simulate', (req, res) => {
  const { waterLevel, rainfall, district } = req.body;
  const db = readDb();

  const numericLevel = parseFloat(waterLevel) ?? 10;
  const rainString = rainfall === 'Yes' || rainfall === true ? 'Yes' : 'No';
  const targetDistrict = district || 'Nagpur';

  const thresholds = db.deviceState.thresholds || { safe: 15, warning: 25, danger: 25 };
  const status = evaluateStatus(numericLevel, thresholds);
  const isDanger = status === 'Danger';
  const { formattedTime, formattedDate } = getKolkataDateTime();

  db.deviceState.waterLevel = numericLevel;
  db.deviceState.rainfall = rainString;
  db.deviceState.status = status;
  db.deviceState.district = targetDistrict;
  db.deviceState.lastSeen = new Date().toISOString();
  db.deviceState.online = true;
  db.deviceState.buzzerAlert = isDanger;

  if (isDanger) {
    db.deviceState.led = 'ON';
  }

  const newRecord = {
    id: 'rec_' + Date.now(),
    waterLevel: `${numericLevel} cm`,
    waterLevelValue: numericLevel,
    rainfall: rainString,
    district: targetDistrict,
    time: formattedTime,
    date: formattedDate,
    status: status,
    timestamp: Date.now()
  };

  db.records.unshift(newRecord);
  if (db.records.length > 500) {
    db.records = db.records.slice(0, 500);
  }

  const station = db.stations.find(s => s.district.toLowerCase() === targetDistrict.toLowerCase());
  if (station) {
    station.waterLevel = numericLevel;
    station.rainfall = rainString;
    station.status = status;
    station.lastUpdate = formattedTime;
  }

  writeDb(db);

  return res.json({
    success: true,
    message: 'Simulation telemetry injected successfully.',
    deviceState: { ...db.deviceState, online: true },
    record: newRecord
  });
});

// Search city coordinates comparison endpoint (Section 2)
// "Give a search bar here to search the city and if the city coordinated matches the coordinates of the hardware then show"
app.get('/api/search-city', (req, res) => {
  const query = (req.query.q || '').trim().toLowerCase();
  const db = readDb();

  if (!query) {
    return res.json({ success: true, matchesHardware: false, results: [] });
  }

  // Predefined city coordinates lookup for Indian cities & river basins
  const cityDatabase = [
    { city: 'Nagpur', state: 'Maharashtra', lat: 21.1458, lon: 79.0882, river: 'Nag / Kanhan' },
    { city: 'Bhandara', state: 'Maharashtra', lat: 21.1713, lon: 79.6545, river: 'Wainganga' },
    { city: 'Chandrapur', state: 'Maharashtra', lat: 19.9615, lon: 79.2961, river: 'Wardha / Erai' },
    { city: 'Wardha', state: 'Maharashtra', lat: 20.7453, lon: 78.6022, river: 'Wardha' },
    { city: 'Gadchiroli', state: 'Maharashtra', lat: 20.1809, lon: 79.9937, river: 'Pranhita' },
    { city: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lon: 72.8777, river: 'Mithi' },
    { city: 'Pune', state: 'Maharashtra', lat: 18.5204, lon: 73.8567, river: 'Mula-Mutha' },
    { city: 'Delhi', state: 'Delhi', lat: 28.6139, lon: 77.2090, river: 'Yamuna' },
    { city: 'Patna', state: 'Bihar', lat: 25.5941, lon: 85.1376, river: 'Ganga' }
  ];

  const matchedCities = cityDatabase.filter(c =>
    c.city.toLowerCase().includes(query) || c.state.toLowerCase().includes(query)
  );

  const hwLat = db.deviceState.lat || 21.1458;
  const hwLon = db.deviceState.lon || 79.0882;
  const hwDistrict = (db.deviceState.district || 'Nagpur').toLowerCase();

  // Check if coordinates match within ~0.2 degrees or district matches
  const matchingCity = matchedCities.find(c => {
    const coordMatch = Math.abs(c.lat - hwLat) < 0.25 && Math.abs(c.lon - hwLon) < 0.25;
    const nameMatch = c.city.toLowerCase() === hwDistrict;
    return coordMatch || nameMatch;
  });

  return res.json({
    success: true,
    matchesHardware: !!matchingCity,
    matchedHardwareStation: matchingCity ? {
      city: matchingCity.city,
      lat: matchingCity.lat,
      lon: matchingCity.lon,
      river: matchingCity.river,
      currentWaterLevel: db.deviceState.waterLevel,
      rainfall: db.deviceState.rainfall,
      status: db.deviceState.status,
      online: isDeviceOnline(db.deviceState.lastSeen)
    } : null,
    allMatches: matchedCities
  });
});

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
ensureDatabase();
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🌊 Flood Monitoring System Server Running!`);
  console.log(`🚀 Port: ${PORT}`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`⏰ Timezone: Asia/Kolkata (+5:30)`);
  console.log(`👨‍💻 Team: Team Pirates`);
  console.log(`====================================================`);
});
