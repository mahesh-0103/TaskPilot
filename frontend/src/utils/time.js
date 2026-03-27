/**
 * Time utilities for TaskPilot
 */

export function formatDistanceToNow(isoString) {
  if (!isoString) return '';
  const now = new Date();
  const date = new Date(isoString);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export function getDeadlineCountdown(deadline) {
  if (!deadline) return { text: '—', urgency: 'none' };
  
  const now = new Date();
  // Safe date construction: only append end-of-day if it's just a YYYY-MM-DD string
  const cleanDeadline = (deadline.length === 10 && deadline.includes('-')) 
    ? `${deadline}T23:59:59` 
    : deadline;
  
  const due = new Date(cleanDeadline);
  if (isNaN(due.getTime())) return { text: deadline, urgency: 'none' };
  
  const diffMs = due - now;
  const diffHr = diffMs / (1000 * 60 * 60);
  const diffDay = diffMs / (1000 * 60 * 60 * 24);

  if (diffMs < 0) return { text: 'Overdue', urgency: 'overdue' };
  if (diffHr < 1) {
    const min = Math.ceil(diffMs / (1000 * 60));
    return { text: `${min}m`, urgency: 'critical' };
  }
  if (diffDay < 1) return { text: `${Math.floor(diffHr)}h ${Math.floor(diffMs / (1000 * 60)) % 60}m`, urgency: 'critical' };
  if (diffDay <= 3) return { text: `${Math.ceil(diffDay)}d`, urgency: 'warning' };
  return { text: `${Math.ceil(diffDay)}d`, urgency: 'normal' };
}

export function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

export function formatDateLong(date = new Date()) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}
