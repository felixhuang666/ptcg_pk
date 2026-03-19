import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DiceFace, TeamConfig } from '../shared/types';

interface AppState {
  teams: TeamConfig[];
  currentTeamId: string | null;
  addTeam: (team: TeamConfig) => void;
  updateTeam: (team: TeamConfig) => void;
  deleteTeam: (id: string) => void;
  setCurrentTeamId: (id: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      teams: [
        {
          id: 'default-team',
          name: '預設隊伍',
          dices: [
            { faces: [DiceFace.ATTACK, DiceFace.DEFENSE, DiceFace.DODGE, DiceFace.EARTH, DiceFace.WATER, DiceFace.FIRE] },
            { faces: [DiceFace.ATTACK, DiceFace.DEFENSE, DiceFace.DODGE, DiceFace.WIND, DiceFace.EARTH, DiceFace.WATER] },
            { faces: [DiceFace.ATTACK, DiceFace.DEFENSE, DiceFace.DODGE, DiceFace.FIRE, DiceFace.WIND, DiceFace.EMPTY] },
            { faces: [DiceFace.ATTACK, DiceFace.DEFENSE, DiceFace.DODGE, DiceFace.EARTH, DiceFace.WATER, DiceFace.FIRE] }
          ],
          monsters: ['m1', 'm2', 'm3']
        }
      ],
      currentTeamId: 'default-team',
      addTeam: (team) => set((state) => ({ teams: [...state.teams, team] })),
      updateTeam: (team) => set((state) => ({
        teams: state.teams.map(t => t.id === team.id ? team : t)
      })),
      deleteTeam: (id) => set((state) => ({
        teams: state.teams.filter(t => t.id !== id),
        currentTeamId: state.currentTeamId === id ? (state.teams[0]?.id || null) : state.currentTeamId
      })),
      setCurrentTeamId: (id) => set({ currentTeamId: id })
    }),
    {
      name: 'monster-battle-storage',
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          persistedState.teams = persistedState.teams.map((t: any) => {
            if (t.dices.length === 3) {
              t.dices.push({ faces: [DiceFace.ATTACK, DiceFace.DEFENSE, DiceFace.DODGE, DiceFace.EARTH, DiceFace.WATER, DiceFace.FIRE] });
            }
            return t;
          });
        }
        if (version < 2) {
          // Reset to valid default team if they only had the old default team
          if (persistedState.teams && persistedState.teams.length === 1 && persistedState.teams[0].id === 'default-team') {
            persistedState.teams[0].dices = [
              { faces: [DiceFace.ATTACK, DiceFace.DEFENSE, DiceFace.DODGE, DiceFace.EARTH, DiceFace.WATER, DiceFace.FIRE] },
              { faces: [DiceFace.ATTACK, DiceFace.DEFENSE, DiceFace.DODGE, DiceFace.WIND, DiceFace.EARTH, DiceFace.WATER] },
              { faces: [DiceFace.ATTACK, DiceFace.DEFENSE, DiceFace.DODGE, DiceFace.FIRE, DiceFace.WIND, DiceFace.EMPTY] },
              { faces: [DiceFace.ATTACK, DiceFace.DEFENSE, DiceFace.DODGE, DiceFace.EARTH, DiceFace.WATER, DiceFace.FIRE] }
            ];
          }
        }
        return persistedState;
      }
    }
  )
);
