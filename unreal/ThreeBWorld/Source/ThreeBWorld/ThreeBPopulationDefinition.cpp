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

bool UThreeBPopulationDefinition::FindNpcRole(FName Id, FThreeBNpcRoleDefinition& OutRole) const
{
    for (const FThreeBNpcRoleDefinition& Role : NpcRoles)
    {
        if (Role.Id == Id)
        {
            OutRole = Role;
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

    TSet<FName> RoleIds;
    for (const FThreeBNpcRoleDefinition& Role : NpcRoles)
    {
        if (Role.Id.IsNone())
        {
            OutErrors.Add(TEXT("NPC role with empty Id."));
            continue;
        }
        if (RoleIds.Contains(Role.Id))
        {
            OutErrors.Add(FString::Printf(TEXT("Duplicate NPC role: %s"), *Role.Id.ToString()));
        }
        RoleIds.Add(Role.Id);

        if (Role.DistrictId.IsNone() || Role.ZoneId.IsNone())
        {
            OutErrors.Add(FString::Printf(TEXT("NPC role %s is missing district or zone."), *Role.Id.ToString()));
        }
        if (!Role.RoutineId.IsNone() && !RoutineIds.Contains(Role.RoutineId))
        {
            OutErrors.Add(FString::Printf(
                TEXT("NPC role %s references unknown routine %s."),
                *Role.Id.ToString(),
                *Role.RoutineId.ToString()
            ));
        }
    }

    return OutErrors.IsEmpty();
}
