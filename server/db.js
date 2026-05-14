const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'aiada_accessibility',
      }
);

// All feature table names that need user_id
const FEATURE_TABLES = [
  'website_scans',
  'wcag_checks',
  'alt_texts',
  'color_contrasts',
  'screen_reader_optimizations',
  'keyboard_audits',
  'aria_labels',
  'accessibility_reports',
  'remediation_plans',
  'legal_assessments',
  'pdf_checks',
  'form_analyses',
  'video_captions',
  'readability_analyses',
  'accessibility_policies',
];

async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS website_scans (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        url VARCHAR(500),
        status VARCHAR(50) DEFAULT 'pending',
        ai_result JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS wcag_checks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        url VARCHAR(500),
        status VARCHAR(50) DEFAULT 'pending',
        ai_result JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS alt_texts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        url VARCHAR(500),
        status VARCHAR(50) DEFAULT 'pending',
        ai_result JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS color_contrasts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        url VARCHAR(500),
        status VARCHAR(50) DEFAULT 'pending',
        ai_result JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS screen_reader_optimizations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        url VARCHAR(500),
        status VARCHAR(50) DEFAULT 'pending',
        ai_result JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS keyboard_audits (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        url VARCHAR(500),
        status VARCHAR(50) DEFAULT 'pending',
        ai_result JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS aria_labels (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        url VARCHAR(500),
        status VARCHAR(50) DEFAULT 'pending',
        ai_result JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS accessibility_reports (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        url VARCHAR(500),
        status VARCHAR(50) DEFAULT 'pending',
        ai_result JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS remediation_plans (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        url VARCHAR(500),
        status VARCHAR(50) DEFAULT 'pending',
        ai_result JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS legal_assessments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        url VARCHAR(500),
        status VARCHAR(50) DEFAULT 'pending',
        ai_result JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS pdf_checks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        url VARCHAR(500),
        status VARCHAR(50) DEFAULT 'pending',
        ai_result JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS form_analyses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        url VARCHAR(500),
        status VARCHAR(50) DEFAULT 'pending',
        ai_result JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS video_captions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        url VARCHAR(500),
        status VARCHAR(50) DEFAULT 'pending',
        ai_result JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS readability_analyses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        url VARCHAR(500),
        status VARCHAR(50) DEFAULT 'pending',
        ai_result JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS accessibility_policies (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        url VARCHAR(500),
        status VARCHAR(50) DEFAULT 'pending',
        ai_result JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS remediations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        issue_type VARCHAR(255),
        original_html TEXT,
        fixed_html TEXT,
        wcag_criteria VARCHAR(255),
        ai_result JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ai_results (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        feature VARCHAR(100),
        item_id INTEGER,
        table_name VARCHAR(100),
        ai_result JSONB,
        model VARCHAR(100),
        prompt_tokens INTEGER,
        completion_tokens INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS score_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        item_id INTEGER NOT NULL,
        feature_type VARCHAR(100),
        table_name VARCHAR(100),
        score NUMERIC,
        recorded_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS wcag_knowledge_base (
        id SERIAL PRIMARY KEY,
        criterion VARCHAR(20) NOT NULL,
        level VARCHAR(5) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        techniques TEXT,
        failure_examples TEXT,
        code_fix_template TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Migrate existing tables: add user_id column IF NOT EXISTS
    for (const table of FEATURE_TABLES) {
      await client.query(
        `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id)`
      );
    }

    // Migrate users table: add extra profile columns
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user'`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS organization VARCHAR(255)`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`);

    // Seed WCAG knowledge base with common criteria if empty
    const kbCount = await client.query('SELECT COUNT(*) FROM wcag_knowledge_base');
    if (parseInt(kbCount.rows[0].count, 10) === 0) {
      await client.query(`
        INSERT INTO wcag_knowledge_base (criterion, level, title, description, techniques, failure_examples, code_fix_template) VALUES
        ('1.1.1', 'A', 'Non-text Content', 'All non-text content has a text alternative.', 'Add alt attribute to img elements. Use aria-label for icon buttons.', 'img without alt attribute; icon button with no aria-label', '<img src="photo.jpg" alt="Description of photo" />'),
        ('1.3.1', 'A', 'Info and Relationships', 'Information, structure, and relationships can be programmatically determined.', 'Use semantic HTML (header, nav, main, footer). Use proper heading hierarchy.', 'Using div instead of button; styling text to look like a heading', '<button type="button">Click me</button>'),
        ('1.4.3', 'AA', 'Contrast (Minimum)', 'Text has a contrast ratio of at least 4.5:1 for normal text, 3:1 for large text.', 'Use a color contrast checker. Ensure foreground/background colors meet minimums.', 'Light grey text on white background', 'color: #333333; background: #ffffff; /* ratio 9.7:1 */'),
        ('2.1.1', 'A', 'Keyboard', 'All functionality is available from a keyboard.', 'Test all interactive elements with Tab key. Ensure no keyboard traps.', 'Click-only event handlers; focus trapped in modal without Escape key', 'element.addEventListener("keydown", (e) => { if (e.key === "Enter") handleAction(); });'),
        ('2.4.3', 'A', 'Focus Order', 'Focusable components receive focus in an order that preserves meaning.', 'Ensure tab order follows visual/logical reading order. Avoid positive tabindex.', 'tabindex="5" breaking natural order', 'Use tabindex="0" for custom interactive elements; avoid tabindex > 0'),
        ('2.4.7', 'AA', 'Focus Visible', 'Keyboard focus indicator is visible.', 'Never use outline: none without providing an alternative focus indicator.', 'CSS: *:focus { outline: none; }', '*:focus-visible { outline: 3px solid #005fcc; outline-offset: 2px; }'),
        ('3.1.1', 'A', 'Language of Page', 'The default human language of each web page can be programmatically determined.', 'Set lang attribute on html element.', 'html element without lang attribute', '<html lang="en">'),
        ('4.1.1', 'A', 'Parsing', 'Markup is well-formed with no duplicate IDs.', 'Validate HTML. Ensure unique IDs throughout page.', 'Duplicate id="submit-btn" on multiple elements', 'Use unique IDs: id="form-submit-btn"'),
        ('4.1.2', 'A', 'Name, Role, Value', 'UI components have accessible names and roles.', 'Use aria-label, aria-labelledby, or visible text. Assign appropriate roles.', 'Icon-only button without accessible name', '<button aria-label="Close dialog"><svg aria-hidden="true">...</svg></button>'),
        ('1.4.4', 'AA', 'Resize Text', 'Text can be resized up to 200% without loss of content or functionality.', 'Use relative units (rem, em, %) for font sizes. Test at 200% zoom.', 'Fixed pixel font sizes that overflow containers at 200% zoom', 'font-size: 1rem; /* scales with user preferences */')
        ON CONFLICT DO NOTHING
      `);
    }

    console.log('Database tables initialized successfully');
  } catch (err) {
    console.error('Error initializing database:', err.message);
  } finally {
    client.release();
  }
}

module.exports = { pool, initDb };
