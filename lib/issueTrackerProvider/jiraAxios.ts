import type { JiraTrackerClientConfig } from './types';
import type { AxiosInstance } from 'axios';

import axios from 'axios';

export function jiraAuthorizationHeader(config: JiraTrackerClientConfig): string {
  const email = config.email?.trim() ?? '';
  const token = config.apiToken.trim();
  if (email) {
    const basic = Buffer.from(`${email}:${token}`, 'utf8').toString('base64');
    return `Basic ${basic}`;
  }
  return `Bearer ${token}`;
}

export function createJiraAxiosInstance(config: JiraTrackerClientConfig): AxiosInstance {
  return axios.create({
    baseURL: config.apiUrl?.trim() || undefined,
    headers: {
      Accept: 'application/json',
      Authorization: jiraAuthorizationHeader(config),
      'Content-Type': 'application/json',
    },
  });
}
