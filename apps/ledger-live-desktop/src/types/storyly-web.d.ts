declare module "storyly-web" {
  type StorylyData = Array<{
    title: string;
    image: URL;
    pinned: boolean;
    id: number;
  }>;

  /**
   * Storyly Options
   */
  interface StorylyOptions {
    layout: "classic" | "modern";
    token: string;
    events?: {
      closeStoryGroup?(): void;
      isReady?(data: StorylyData): void;
    };
    lang?: Language;
    segments?: string[];
    props?: StorylyStyleProps;
  }

  /**
   * Storyly Ref
   */
  interface StorylyRef {
    init: (options: StorylyOptions) => void;
    setSegments: (options: StorylyOptions["segments"]) => void;
    setLang: (options: { language: StorylyOptions["lang"] }) => void;
    openStory: (props: openStoryParams) => void;
  }

  interface openStoryParams {
    group?: string;
    story?: string;
    playMode?: string;
  }

  interface StorylyWebProps<T = StorylyRef> {
    ref?: React.LegacyRef<T> | React.RefObject<T>;
  }

  interface StorylyWebProps {
    // Omitting the `ref` prop here
  }

  // Use the existing "storyly-web" component directly
  const StorylyWeb: React.ForwardRefExoticComponent<
    StorylyWebProps & React.RefAttributes<StorylyRef>
  >;

  export default StorylyWeb;
  export { StorylyRef, StorylyOptions, StorylyData, openStoryParams };
}
