/**
 * Sanitize user input for use in Supabase PostgREST .or() and .ilike() filters.
 * Prevents PostgREST filter injection attacks.
 * 
 * PostgREST special characters that could manipulate queries:
 * - Commas (,) separate filter clauses in .or()
 * - Dots (.) separate column.operator.value
 * - Parentheses can affect grouping
 * - Percent signs (%) are wildcards in ILIKE but can cause issues if injected elsewhere
 */
export const sanitizeSearchInput = (input: string): string => {
  return input
    .replace(/[,.()\[\]{}]/g, "") // Remove PostgREST operators
    .replace(/['"`;\\]/g, "")     // Remove SQL-like characters
    .trim()
    .slice(0, 200); // Limit length
};
