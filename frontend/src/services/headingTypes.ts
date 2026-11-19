export type HeadingSubscription = { readonly remove: () => void };
export type HeadingSample = { readonly degrees: number; readonly timestamp: number };
export type HeadingStartResult =
  | { readonly status: "started"; readonly subscription: HeadingSubscription }
  | { readonly status: "denied" | "unavailable"; readonly message: string };
export type HeadingCallback = (sample: HeadingSample) => void;
export type HeadingIssueCallback = (message: string) => void;
