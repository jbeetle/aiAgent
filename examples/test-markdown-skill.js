/**
 * Markdown Skill 格式测试
 * 测试从 Markdown 文件加载 Skill
 */

import { SkillEngine, SkillManager, validateSkill } from '../src/skills/index.js';
import { getBuiltInTools } from '../src/agents/tools/tool.js';
import { createLogger } from '../src/agents/utils/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const log = {
  info: (msg) => console.log(`ℹ ${msg}`),
  success: (msg) => console.log(`✓ ${msg}`),
  error: (msg) => console.log(`✗ ${msg}`),
  section: (msg) => console.log(`\n=== ${msg} ===\n`),
};

async function runTest() {
  log.section('Markdown Skill Loading Test');

  // 创建 SkillEngine 和 SkillManager
  const tools = getBuiltInTools();
  const skillEngine = new SkillEngine({ get: () => null }, null);
  const skillManager = new SkillManager(skillEngine, { verbose: false });

  // 测试 1: JSON frontmatter 格式
  log.section('Test 1: JSON Frontmatter Format');
  try {
    const skill1 = await skillManager.loadFromFile(
      path.join(__dirname, 'my-skill.skill.md')
    );
    log.success(`Loaded skill: ${skill1.name} v${skill1.version}`);
    log.info(`Description: ${skill1.description}`);
    log.info(`Parameters: ${Object.keys(skill1.parameters?.properties || {}).join(', ')}`);

    // 验证技能定义
    const validation = validateSkill(skill1);
    if (validation.valid) {
      log.success('Skill validation passed');
    } else {
      log.error(`Validation failed: ${validation.errors.join(', ')}`);
    }
  } catch (error) {
    log.error(`Failed to load JSON frontmatter skill: ${error.message}`);
  }

  // 测试 2: YAML frontmatter 格式
  log.section('Test 2: YAML Frontmatter Format');
  try {
    const skill2 = await skillManager.loadFromFile(
      path.join(__dirname, 'code-formatter.skill.md')
    );
    log.success(`Loaded skill: ${skill2.name} v${skill2.version}`);
    log.info(`Description: ${skill2.description}`);
    log.info(`Parameters: ${Object.keys(skill2.parameters?.properties || {}).join(', ')}`);

    // 验证技能定义
    const validation = validateSkill(skill2);
    if (validation.valid) {
      log.success('Skill validation passed');
    } else {
      log.error(`Validation failed: ${validation.errors.join(', ')}`);
    }
  } catch (error) {
    log.error(`Failed to load YAML frontmatter skill: ${error.message}`);
  }

  // 测试 3: 加载目录（包含 .md 文件）
  log.section('Test 3: Load Directory with Markdown Skills');
  try {
    // 创建一个测试目录
    const fs = await import('fs/promises');
    const testDir = path.join(__dirname, 'test-skills-dir');

    try {
      await fs.mkdir(testDir, { recursive: true });

      // 复制测试文件
      await fs.copyFile(
        path.join(__dirname, 'my-skill.skill.md'),
        path.join(testDir, 'text-summarizer.skill.md')
      );
      await fs.copyFile(
        path.join(__dirname, 'code-formatter.skill.md'),
        path.join(testDir, 'code-formatter.skill.md')
      );

      // 加载目录
      const loadedSkills = await skillManager.loadFromDirectory(testDir);
      log.success(`Loaded ${loadedSkills.length} skills from directory`);
      loadedSkills.forEach(skill => {
        log.info(`  - ${skill.name} v${skill.version}`);
      });

      // 清理
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (e) {
      log.error(`Directory test failed: ${e.message}`);
    }
  } catch (error) {
    log.error(`Failed to test directory loading: ${error.message}`);
  }

  // 测试 4: 错误处理
  log.section('Test 4: Error Handling');
  try {
    // 创建一个无效的 markdown 文件
    const fs = await import('fs/promises');
    const invalidFile = path.join(__dirname, 'invalid.skill.md');
    await fs.writeFile(invalidFile, '# Invalid Skill\n\nThis file has no frontmatter or code block.\n');

    try {
      await skillManager.loadFromFile(invalidFile);
      log.error('Should have thrown an error for invalid skill');
    } catch (e) {
      log.success(`Correctly rejected invalid skill: ${e.message.substring(0, 100)}...`);
    }

    // 清理
    await fs.rm(invalidFile, { force: true });
  } catch (error) {
    log.error(`Error handling test failed: ${error.message}`);
  }

  // 显示所有已加载的技能
  log.section('Loaded Skills Summary');
  const summaries = skillManager.getSkillSummaries();
  log.info(`Total skills loaded: ${summaries.length}`);
  summaries.forEach(skill => {
    console.log(`  - ${skill.name} (${skill.source})`);
  });

  log.section('Test Complete');
}

runTest().catch(console.error);
