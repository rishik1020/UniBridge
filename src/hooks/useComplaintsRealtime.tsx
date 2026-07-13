import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Keeps a view in sync with the `complaints` table.
 * - Fires `onChange` on any insert/update/delete via Supabase realtime
 *   (requires the `complaints` table to be in the `supabase_realtime` publication).
 * - Also fires `onChange` when the browser tab regains focus, so panels still
 *   refresh promptly even if realtime isn't enabled on the project.
 *
 * `channelKey` should be stable per mounted view (e.g. the user id) so each
 * open dashboard gets its own realtime channel.
 */
export function useComplaintsRealtime(onChange: () => void, channelKey: string) {
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    const handler = () => cb.current();
    const channel = supabase
      .channel(`complaints-rt-${channelKey}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "complaints" }, handler)
      .subscribe();
    window.addEventListener("focus", handler);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", handler);
    };
  }, [channelKey]);
}
