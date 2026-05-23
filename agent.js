const fs = require('fs');
const path = require('path');

// Read CSV file function
function readCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((h, i) => obj[h.trim()] = values[i]?.trim());
    return obj;
  });
}

// JOIN tasks + wellbeing by date (like SQL JOIN)
function joinByDate(tasks, wellbeing, date) {
  const todayTasks = tasks.filter(t => t.date === date || t.due_date === date);
  const todayWellbeing = wellbeing.find(w => w.date === date);
  const overdueTasks = tasks.filter(t => t.due_date < date && t.status === 'pending');
  const urgentPending = tasks.filter(t => t.priority === 'high' && t.status === 'pending');
  return { todayTasks, todayWellbeing, overdueTasks, urgentPending };
}

// Calculate mental load score
function calculateLoad(todayTasks, todayWellbeing, overdueTasks, urgentPending) {
  let score = 0;
  let reasons = [];

  // Overdue tasks
  if (overdueTasks.length >= 3) {
    score += 30;
    reasons.push(`${overdueTasks.length} overdue tasks pending`);
  } else if (overdueTasks.length >= 1) {
    score += 15;
    reasons.push(`${overdueTasks.length} overdue task(s)`);
  }

  // Urgent pending tasks
  if (urgentPending.length >= 4) {
    score += 25;
    reasons.push(`${urgentPending.length} high priority tasks pending`);
  } else if (urgentPending.length >= 2) {
    score += 15;
    reasons.push(`${urgentPending.length} high priority tasks pending`);
  }

  // Sleep score
  if (todayWellbeing) {
    const sleep = parseFloat(todayWellbeing.sleep_hours);
    if (sleep < 6) {
      score += 20;
      reasons.push(`Low sleep: only ${sleep} hours`);
    } else if (sleep < 7) {
      score += 10;
      reasons.push(`Below ideal sleep: ${sleep} hours`);
    }

    // Mood score
    const mood = parseInt(todayWellbeing.mood_score);
    if (mood <= 4) {
      score += 20;
      reasons.push(`Low mood score: ${mood}/10`);
    } else if (mood <= 6) {
      score += 10;
      reasons.push(`Average mood: ${mood}/10`);
    }

    // Energy level
    if (todayWellbeing.energy_level === 'low') {
      score += 15;
      reasons.push('Low energy level today');
    }
  }

  score = Math.min(score, 100);
  return { score, reasons };
}

// Get advice
function getAdvice(score) {
  if (score >= 61) {
    return {
      level: 'HIGH',
      color: '#e74c3c',
      message: 'You are OVERLOADED! Focus only on 1-2 most urgent tasks. Cancel non-essential plans. Sleep early tonight.',
      emoji: '🔴'
    };
  } else if (score >= 31) {
    return {
      level: 'MEDIUM',
      color: '#f39c12',
      message: 'Manageable but be careful. Prioritize high-priority tasks first. Take breaks every 90 minutes.',
      emoji: '🟡'
    };
  } else {
    return {
      level: 'LOW',
      color: '#27ae60',
      message: 'Great day for deep work! Tackle your hardest task first. You have the energy and focus today.',
      emoji: '🟢'
    };
  }
}

// Get weekly trend
function getWeeklyTrend(wellbeing) {
  return wellbeing.slice(-7).map(w => ({
    date: w.date,
    mood: parseInt(w.mood_score),
    sleep: parseFloat(w.sleep_hours),
    energy: w.energy_level
  }));
}

// Main function
function runAgent(targetDate) {
  const today = targetDate || new Date().toISOString().split('T')[0];

  const tasks = readCSV(path.join(__dirname, 'tasks.csv'));
  const wellbeing = readCSV(path.join(__dirname, 'wellbeing.csv'));

  // Cross-source JOIN (like SQL)
  const { todayTasks, todayWellbeing, overdueTasks, urgentPending } = joinByDate(tasks, wellbeing, today);
  const { score, reasons } = calculateLoad(todayTasks, todayWellbeing, overdueTasks, urgentPending);
  const advice = getAdvice(score);
  const weeklyTrend = getWeeklyTrend(wellbeing);

  return {
    date: today,
    score,
    advice,
    reasons,
    todayTasks,
    todayWellbeing,
    overdueTasks,
    urgentPending,
    weeklyTrend
  };
}

module.exports = { runAgent };