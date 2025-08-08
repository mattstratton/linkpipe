declare module 'passport-github2' {
  import { Strategy as PassportStrategy } from 'passport';
  
  interface StrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    scope?: string[];
  }
  
  interface Profile {
    id: string;
    username: string;
    displayName: string;
    emails?: Array<{ value: string; verified?: boolean }>;
    photos?: Array<{ value: string }>;
  }
  
  class Strategy extends PassportStrategy {
    constructor(options: StrategyOptions, verify: (
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      done: (error: any, user?: any) => void
    ) => void);
  }
  
  export = Strategy;
} 