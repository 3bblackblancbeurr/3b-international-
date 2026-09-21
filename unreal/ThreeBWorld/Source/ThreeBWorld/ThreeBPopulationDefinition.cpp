#include "ThreeBPopulationDefinition.h"

bool UThreeBPopulationDefinition::FindRoutine(FName Id, FThreeBPopulationRoutineProfile& OutRoutine) const
{
    for (const FThreeBPopulationRoutineProfile& Routine : RoutineProfiles)
    {
        if (Routine.Id == Id)
        {
            OutRoutine = Routine;
            return true;
        }
    }
    return false;
}

bool UThreeBPopulationDefinition::ValidateDefinition(TArray<FString>& OutErrors) const
{
    OutErrors.Reset();

    if (PopulationId.IsNone())
    {
        OutErrors.Add(TEXT("PopulationId is required."));
    }

    if (ActiveAiControllerBudget < 0)
    {
        OutErrors.Add(TEXT("ActiveAiControllerBudget cannot be negative."));
    }

    TSet<FName> TierIds;
    float PreviousDistance = -1.0f;
    for (const FThreeBPopulationSimulationTier& Tier : SimulationTiers)
    {
        if (Tier.Id.IsNone())
        {
            OutErrors.Add(TEXT("Simulation tier with empty Id."));
            continue;
        }
        if (TierIds.Contains(Tier.Id))
        {
            OutErrors.Add(FString::Printf(TEXT("Duplicate simulation tier: %s"), *Tier.Id.ToString()));
        }
        TierIds.Add(Tier.Id);

        if (Tier.MaxDistanceCm < PreviousDistance)
        {
            OutErrors.Add(TEXT("Simulation tiers must be ordered by distance."));
        }
        PreviousDistance = Tier.MaxDistanceCm;
    }

    TSet<FName> RoutineIds;
    for (const FThreeBPopulationRoutineProfile& Routine : RoutineProfiles)
    {
        if (Routine.Id.IsNone())
        {
            OutErrors.Add(TEXT("Routine with empty Id."));
            continue;
        }
        if (RoutineIds.Contains(Routine.Id))
        {
            OutErrors.Add(FString::Printf(TEXT("Duplicate routine: %s"), *Routine.Id.ToString()));
        }
        RoutineIds.Add(Routine.Id);
    }

    for (const FThreeBPopulationArchetype& Archetype : Archetypes)
    {
        if (Archetype.DistrictId.IsNone())
        {
            OutErrors.Add(TEXT("Population archetype with empty DistrictId."));
        }
        if (Archetype.TargetPopulation < 0)
        {
            OutErrors.Add(FString::Printf(TEXT("Negative population target in district %s."), *Archetype.DistrictId.ToString()));
        }
    }

    return OutErrors.IsEmpty();
}
