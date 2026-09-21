export class AddTrackerTeamMemberError extends Error {
  override readonly name = 'AddTrackerTeamMemberError';

  constructor(
    message: string,
    public readonly httpStatus: number
  ) {
    super(message);
  }
}
