#include "ThreeBPopulationSubsystem.h"

void UThreeBPopulationSubsystem::SetPopulationDefinition(
    UThreeBPopulationDefinition* InDefinition
)
{
    PopulationDefinition = InDefinition;
}

bool UThreeBPopulationSubsystem::ResolveSimulationTier(
    float DistanceCm,
    FName& OutTierId,
    FName& OutMode
) const
{
    OutTierId = NAME_None;
    OutMode = NAME_None;

    if (!PopulationDefinition)
    {
        return false;
    }

    const float SafeDistance = FMath::Max(0.0f, DistanceCm);
    for (const FThreeBPopulationSimulationTier& Tier : PopulationDefinition->SimulationTiers)
    {
        if (SafeDistance <= Tier.MaxDistanceCm)
        {
            OutTierId = Tier.Id;
            OutMode = Tier.Mode;
            return true;
        }
    }

    if (!PopulationDefinition->SimulationTiers.IsEmpty())
    {
        const FThreeBPopulationSimulationTier& LastTier =
            PopulationDefinition->SimulationTiers.Last();
        OutTierId = LastTier.Id;
        OutMode = LastTier.Mode;
        return true;
    }

    return false;
}

bool UThreeBPopulationSubsystem::ResolveRoutineActivity(
    FName RoutineId,
    EThreeBDayPeriod Period,
    FName& OutActivity
) const
{
    OutActivity = NAME_None;

    if (!PopulationDefinition)
    {
        return false;
    }

    FThreeBPopulationRoutineProfile Routine;
    if (!PopulationDefinition->FindRoutine(RoutineId, Routine))
    {
        return false;
    }

    switch (Period)
    {
        case EThreeBDayPeriod::Morning:
            OutActivity = Routine.Morning;
            break;
        case EThreeBDayPeriod::Day:
            OutActivity = Routine.Day;
            break;
        case EThreeBDayPeriod::Evening:
            OutActivity = Routine.Evening;
            break;
        case EThreeBDayPeriod::Night:
            OutActivity = Routine.Night;
            break;
        default:
            return false;
    }

    return !OutActivity.IsNone();
}

bool UThreeBPopulationSubsystem::CanActivateFullAi(int32 CurrentActiveControllers) const
{
    return PopulationDefinition
        && CurrentActiveControllers >= 0
        && CurrentActiveControllers < PopulationDefinition->ActiveAiControllerBudget;
}
