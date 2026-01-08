/**
 * Employee name mapping utilities
 * Maps employee email addresses to their first names
 */

interface EmployeeMapping {
  [email: string]: string;
}

// Map of employee emails to first names
const EMPLOYEE_NAMES: EmployeeMapping = {
  'jon@delawarefencesolutions.com': 'Jon',
  'karl@delawarefencesolutions.com': 'Karl',
  'kevin@delawarefencesolutions.com': 'Kevin',
};

/**
 * Get employee first name from email address
 * @param email - Employee email address
 * @returns First name or email if not found in mapping
 */
export function getEmployeeNameFromEmail(email: string | undefined): string {
  if (!email) return 'Unknown';

  const normalizedEmail = email.toLowerCase().trim();
  return EMPLOYEE_NAMES[normalizedEmail] || email.split('@')[0];
}

/**
 * Get employee initials from email address
 * @param email - Employee email address
 * @returns Initials (e.g., "JD" for "Jon")
 */
export function getEmployeeInitials(email: string | undefined): string {
  const name = getEmployeeNameFromEmail(email);
  if (name === 'Unknown') return 'UN';

  // If it's just a name (not email), return first two letters
  if (!name.includes('@')) {
    return name.substring(0, 2).toUpperCase();
  }

  // If it's an email, get first two letters of username
  return name.split('@')[0].substring(0, 2).toUpperCase();
}

/**
 * Get full employee display with name and email
 * @param email - Employee email address
 * @returns Display string (e.g., "Jon (jon@delawarefencesolutions.com)")
 */
export function getEmployeeDisplayName(email: string | undefined): string {
  if (!email) return 'Unknown';

  const name = getEmployeeNameFromEmail(email);
  if (name === email || name.includes('@')) {
    return email;
  }

  return `${name} (${email})`;
}
