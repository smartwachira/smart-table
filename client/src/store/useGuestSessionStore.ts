import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

interface GuestSessionState {
    guestSessionId: string | null;
    initializeSession: () => void;
    endSession: () => void;
}

export const useGuestSessionStore = create<GuestSessionState>()(
    persist(
        (set, get) => ({
            guestSessionId: null,

            // ⚡ Generates a UUID if the device doesn't have one yet
            initializeSession: () => {
                const currentId = get().guestSessionId;
                if (!currentId) {
                    set({ guestSessionId: uuidv4() });
                }
            },

            // ⚡ For when they eventually pay their bill and leave the venue
            endSession: () => {
                set({ guestSessionId: null });
            }
        }),
        {
            name: 'smart-table-guest-session', // The localStorage key
        }
    )
);