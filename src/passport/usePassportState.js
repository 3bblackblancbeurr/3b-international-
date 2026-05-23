import { useEffect, useMemo, useState } from "react";
import { COUNTRIES, INITIAL_USER, LEVELS, MISSIONS, STARTER_CARDS } from "./passportData";

const STORAGE_KEY = "passport_3b_v1_vite";

function calculateLevel(points) {
  return LEVELS.reduce((current, level) => {
    return points >= level.minPoints ? level.name : current;
  }, "Découverte");
}

function createCountryCard(country) {
  return {
    id: `carte_${country.id}`,
    name: `Carte ${country.name}`,
    type: "country",
    rarity: "Rare",
    unlocked: true,
    country: country.name,
    description: `Carte obtenue en débloquant ${country.name}.`,
  };
}

function createStamp(country, type = "Digital") {
  return {
    id: `tampon_${country.id}_${type.toLowerCase()}`,
    country: country.name,
    type,
    name: `${country.name} — ${type}`,
    date: new Date().toISOString(),
  };
}

export function usePassportState() {
  const [user, setUser] = useState(INITIAL_USER);
  const [countries, setCountries] = useState(COUNTRIES);
  const [cards, setCards] = useState(STARTER_CARDS);
  const [missions, setMissions] = useState(MISSIONS);
  const [lastReward, setLastReward] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setUser(parsed.user || INITIAL_USER);
        setCountries(parsed.countries || COUNTRIES);
        setCards(parsed.cards || STARTER_CARDS);
        setMissions(parsed.missions || MISSIONS);
      }
    } catch (error) {
      console.error("Erreur chargement Passeport 3B", error);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, countries, cards, missions }));
  }, [user, countries, cards, missions, loaded]);

  const activeLevel = useMemo(() => calculateLevel(user.points), [user.points]);

  useEffect(() => {
    if (!loaded) return;
    if (activeLevel !== user.level) {
      setUser((previous) => ({ ...previous, level: activeLevel }));
    }
  }, [activeLevel, loaded, user.level]);

  function createPassport({ pseudo, countryOrigin, avatar }) {
    const country = countries.find((item) => item.name === countryOrigin);
    const originStamp = country ? createStamp(country, "Origine") : null;
    const discoveryCard = STARTER_CARDS.find((card) => card.id === "carte_decouverte_3b");

    const updatedCountries = countries.map((item) => {
      if (item.name === countryOrigin) {
        return { ...item, status: "origin", fragments: Math.max(item.fragments, 1) };
      }
      return item;
    });

    setCountries(updatedCountries);
    setCards((previous) =>
      previous.map((card) =>
        card.id === "carte_decouverte_3b" ? { ...card, unlocked: true } : card
      )
    );

    setUser({
      ...INITIAL_USER,
      pseudo: pseudo || "Explorateur 3B",
      avatar: avatar || "explorateur",
      countryOrigin,
      currentCountry: countryOrigin,
      points: 150,
      level: calculateLevel(150),
      passportActivated: true,
      cardsOwned: discoveryCard ? [discoveryCard.id] : [],
      stampsOwned: originStamp ? [originStamp] : [],
      unlockedCountries: [],
      activeBonuses: [],
    });

    setLastReward({
      title: "Carte Découverte 3B obtenue",
      details: ["Passeport activé", "Explorateur activé", "Carte du monde ouverte", "+150 points"],
    });
  }

  function completeMission(missionId) {
    const mission = missions.find((item) => item.id === missionId);
    if (!mission || user.completedMissions.includes(missionId)) return;

    setMissions((previous) =>
      previous.map((item) => (item.id === missionId ? { ...item, status: "completed" } : item))
    );

    setUser((previous) => ({
      ...previous,
      completedMissions: [...previous.completedMissions, missionId],
      points: previous.points + mission.rewardPoints,
      level: calculateLevel(previous.points + mission.rewardPoints),
    }));

    const rewardDetails = [`+${mission.rewardPoints} points 3B`];

    if (mission.rewardFragmentCountry) {
      gainFragment(mission.rewardFragmentCountry, false);
      rewardDetails.push("+1 fragment de logo");
    }

    setLastReward({
      title: "Mission réussie",
      details: rewardDetails,
    });
  }

  function gainFragment(countryId, showReward = true) {
    let nextCountry = null;

    setCountries((previous) =>
      previous.map((country) => {
        if (country.id !== countryId) return country;
        const fragments = Math.min(country.fragments + 1, country.fragmentsRequired);
        nextCountry = { ...country, fragments };
        return nextCountry;
      })
    );

    setUser((previous) => ({
      ...previous,
      points: previous.points + 50,
      level: calculateLevel(previous.points + 50),
    }));

    if (nextCountry && nextCountry.fragments >= nextCountry.fragmentsRequired) {
      unlockCountry(countryId);
      return;
    }

    if (showReward) {
      setLastReward({
        title: "Fragment obtenu",
        details: ["+1 fragment de logo", "+50 points 3B"],
      });
    }
  }

  function unlockCountry(countryId) {
    const country = countries.find((item) => item.id === countryId);
    if (!country) return;

    if (user.unlockedCountries.includes(countryId)) {
      setLastReward({ title: "Pays déjà débloqué", details: [country.name] });
      return;
    }

    const countryCard = createCountryCard(country);
    const stamp = createStamp(country, "Digital");

    setCountries((previous) =>
      previous.map((item) =>
        item.id === countryId
          ? { ...item, status: "unlocked", fragments: item.fragmentsRequired }
          : item
      )
    );

    setCards((previous) => {
      const exists = previous.some((card) => card.id === countryCard.id);
      return exists ? previous : [...previous, countryCard];
    });

    setUser((previous) => {
      const nextPoints = previous.points + country.rewardPoints + 100;
      return {
        ...previous,
        currentCountry: country.name,
        unlockedCountries: previous.unlockedCountries.includes(countryId)
          ? previous.unlockedCountries
          : [...previous.unlockedCountries, countryId],
        cardsOwned: [...new Set([...previous.cardsOwned, countryCard.id])],
        stampsOwned: [...previous.stampsOwned, stamp],
        activeBonuses: previous.activeBonuses.some((bonus) => bonus.countryId === countryId)
          ? previous.activeBonuses
          : [
              ...previous.activeBonuses,
              {
                countryId,
                countryName: country.name,
                bonusName: country.bonusName,
                level: 1,
                effect: country.bonusEffect,
              },
            ],
        points: nextPoints,
        level: calculateLevel(nextPoints),
      };
    });

    setLastReward({
      title: `${country.name} débloqué`,
      details: [
        `Carte ${country.name} obtenue`,
        `Tampon ${country.name} ajouté`,
        `Bonus ${country.bonusName} niveau 1 activé`,
        `+${country.rewardPoints + 100} points`,
      ],
    });
  }

  function resetPassport() {
    localStorage.removeItem(STORAGE_KEY);
    setUser(INITIAL_USER);
    setCountries(COUNTRIES);
    setCards(STARTER_CARDS);
    setMissions(MISSIONS);
    setLastReward(null);
  }

  return {
    user,
    countries,
    cards,
    missions,
    levels: LEVELS,
    lastReward,
    setLastReward,
    createPassport,
    completeMission,
    gainFragment,
    unlockCountry,
    resetPassport,
  };
}
