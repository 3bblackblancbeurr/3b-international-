import { useState } from "react";

const STORAGE_KEY = "3b_passport_state_safe_v1";

export function createDefaultPassportState() {
  return {
    originCountry: "France",
    selectedCountry: "France",
    points: 0,
    level: "Découverte",
    unlockedCountries: ["France"],
  };
}

export default function usePassportState() {
  const [passportState, setPassportState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) {
        const cleanState = createDefaultPassportState();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanState));
        return cleanState;
      }

      return {
        ...createDefaultPassportState(),
        ...JSON.parse(saved),
      };
    } catch {
      return createDefaultPassportState();
    }
  });

  function updatePassportState(nextState) {
    setPassportState(nextState);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    } catch {
      return null;
    }

    return nextState;
  }

  function selectCountry(country) {
    return updatePassportState({
      ...passportState,
      selectedCountry: country,
      originCountry: country,
    });
  }

  function resetPassport() {
    return updatePassportState(createDefaultPassportState());
  }

  return {
    passportState,
    selectCountry,
    resetPassport,
    updatePassportState,
  };
}