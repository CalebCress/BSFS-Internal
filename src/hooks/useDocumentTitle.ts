import { useEffect } from "react";

/**
 * Set the browser tab title for as long as a page is mounted.
 *
 * The previous title is restored on unmount, so navigating from a public page
 * back into the app doesn't leave the tab claiming to be the application form.
 */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
