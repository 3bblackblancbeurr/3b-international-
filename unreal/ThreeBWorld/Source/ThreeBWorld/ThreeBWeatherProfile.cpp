#include "ThreeBWeatherProfile.h"

bool UThreeBWeatherProfile::FindState(EThreeBWeatherState State, FThreeBWeatherStateDefinition& OutState) const
{
    for (const FThreeBWeatherStateDefinition& Definition : States)
    {
        if (Definition.State == State)
        {
            OutState = Definition;
            return true;
        }
    }
    return false;
}

bool UThreeBWeatherProfile::FindWorldStateOverride(FGameplayTag WorldStateTag, EThreeBWeatherState& OutState) const
{
    if (const EThreeBWeatherState* Found = WorldStateOverrides.Find(WorldStateTag))
    {
        OutState = *Found;
        return true;
    }
    return false;
}

bool UThreeBWeatherProfile::ValidateProfile(TArray<FString>& OutErrors) const
{
    OutErrors.Reset();

    if (ProfileId.IsNone())
    {
        OutErrors.Add(TEXT("ProfileId is required."));
    }

    TSet<uint8> SeenStates;
    for (const FThreeBWeatherStateDefinition& Definition : States)
    {
        const uint8 Key = static_cast<uint8>(Definition.State);
        if (SeenStates.Contains(Key))
        {
            OutErrors.Add(TEXT("Duplicate weather state."));
        }
        SeenStates.Add(Key);

        if (Definition.Wetness < 0.0f || Definition.Wetness > 1.0f)
        {
            OutErrors.Add(TEXT("Weather wetness must be within [0,1]."));
        }
    }

    if (States.Num() != 8)
    {
        OutErrors.Add(FString::Printf(TEXT("Expected 8 weather states, got %d."), States.Num()));
    }

    return OutErrors.IsEmpty();
}
