import { describe, expect, it } from 'vitest';

import {
  AGENT_SKILLS,
  AgentReplyOptionsSchema,
  AgentSessionSkillSchema,
  agentSkillSlashQuery,
  buildAgentSkillAgentView,
  chosenAgentReplyOption,
  parseAgentSessionSkill,
} from './agentSkills';

describe('AgentSessionSkillSchema', () => {
  it('fills defaults and drops unknown params', () => {
    expect(AgentSessionSkillSchema.parse({ id: 'sprint_risks', params: { detail: 'nope', extra: 'x' } })).toEqual({
      id: 'sprint_risks',
      params: { detail: 'short' },
    });
    expect(AgentSessionSkillSchema.parse({ id: 'balance_load', params: { reassign: 'no' } }).params).toEqual({
      reassign: 'no',
    });
  });

  it('rejects an unknown skill', () => {
    expect(AgentSessionSkillSchema.safeParse({ id: 'deploy' }).success).toBe(false);
  });
});

describe('skills', () => {
  it('have unique ids and at least one choice per param', () => {
    expect(new Set(AGENT_SKILLS.map((skill) => skill.id)).size).toBe(AGENT_SKILLS.length);
    for (const skill of AGENT_SKILLS) {
      for (const param of skill.params) {
        expect(Object.keys(param.choices).length).toBeGreaterThan(0);
      }
    }
  });

  it('forget a skill removed from the code', () => {
    expect(parseAgentSessionSkill('removed_skill', {})).toBeNull();
    expect(parseAgentSessionSkill(null, {})).toBeNull();
    expect(parseAgentSessionSkill('place_tasks', null)).toEqual({ id: 'place_tasks', params: { order: 'priority' } });
  });

  it('append the chosen params to the instructions', () => {
    const view = buildAgentSkillAgentView({ id: 'place_tasks', params: { order: 'dependencies' } });
    expect(view?.instructions).toContain('Order by dependencies first');
    expect(view?.instructions).not.toContain('higher priority starts earlier');
  });
});

describe('reply options', () => {
  it('limit count and length', () => {
    expect(AgentReplyOptionsSchema.safeParse(['a', 'b']).success).toBe(true);
    expect(AgentReplyOptionsSchema.safeParse(['']).success).toBe(false);
    expect(AgentReplyOptionsSchema.safeParse(['1', '2', '3', '4', '5', '6']).success).toBe(false);
  });

  it('find the option the person picked', () => {
    expect(chosenAgentReplyOption(['Да', 'Нет'], ' Нет ')).toBe('Нет');
    expect(chosenAgentReplyOption(['Да', 'Нет'], 'Сделай иначе')).toBeNull();
    expect(chosenAgentReplyOption(['Да'], undefined)).toBeNull();
  });
});

describe('agentSkillSlashQuery', () => {
  it('opens only for a slash command at the start of the field', () => {
    expect(agentSkillSlashQuery('/')).toBe('');
    expect(agentSkillSlashQuery('/рис')).toBe('рис');
    expect(agentSkillSlashQuery('/риски спринта')).toBeNull();
    expect(agentSkillSlashQuery('и/или')).toBeNull();
    expect(agentSkillSlashQuery('')).toBeNull();
  });
});
