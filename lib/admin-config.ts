export const ADMIN_EMAILS = [
  "vidmase@gmail.com", // Your admin email
  "admin@example.com", // Additional admin emails
]

export function isAdminEmail(email: string | null): boolean {
  return email ? ADMIN_EMAILS.includes(email) : false
} 