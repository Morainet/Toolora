/**
 * A deliberately broken / "lenient" JSON document used by the JSON Repair
 * tool's "Load sample" button. It exercises jsonrepair's main capabilities:
 * unquoted keys, single quotes, trailing commas, comments, and concat values.
 */
export const SAMPLE_BROKEN_JSON = `{
  // app configuration (comments are not valid JSON)
  name: 'Toolora',
  version: '1.0.0',
  features: [
    'format',
    'minify',
    'validate',
    'repair',
  ],
  config: {
    theme: 'dark',
    fontSize: 14,
  },
  active: true,
}`;
