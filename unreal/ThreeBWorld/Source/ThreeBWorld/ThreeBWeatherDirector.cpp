#include "ThreeBWeatherDirector.h"

#include "Net/UnrealNetwork.h"

AThreeBWeatherDirector::AThreeBWeatherDirector()
{
    bReplicates = true;
    SetReplicateMovement(false);
}

void AThreeBWeatherDirector::BeginPlay()
{
    Super::BeginPlay();

    if (HasAuthority() && WeatherProfile)
    {
        CurrentWeather = WeatherProfile->DefaultState;
        CurrentTransitionSeconds = 0.0f;
        ForceNetUpdate();
    }

    if (AThreeBGameState* StoryGameState = GetWorld() ? GetWorld()->GetGameState<AThreeBGameState>() : nullptr)
    {
        StoryGameState->OnStoryStateChanged.AddDynamic(this, &AThreeBWeatherDirector::HandleStoryStateChanged);
        HandleStoryStateChanged(StoryGameState->GetStoryState());
    }

    BroadcastWeatherPresentation();
}

void AThreeBWeatherDirector::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
    if (AThreeBGameState* StoryGameState = GetWorld() ? GetWorld()->GetGameState<AThreeBGameState>() : nullptr)
    {
        StoryGameState->OnStoryStateChanged.RemoveDynamic(this, &AThreeBWeatherDirector::HandleStoryStateChanged);
    }

    Super::EndPlay(EndPlayReason);
}

void AThreeBWeatherDirector::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const
{
    Super::GetLifetimeReplicatedProps(OutLifetimeProps);
    DOREPLIFETIME(AThreeBWeatherDirector, CurrentWeather);
    DOREPLIFETIME(AThreeBWeatherDirector, CurrentTransitionSeconds);
}

bool AThreeBWeatherDirector::SetWeatherState(EThreeBWeatherState NewState, float TransitionSeconds)
{
    if (!HasAuthority())
    {
        return false;
    }

    if (WeatherProfile)
    {
        FThreeBWeatherStateDefinition Definition;
        if (!WeatherProfile->FindState(NewState, Definition))
        {
            return false;
        }
    }

    const float SafeTransition = TransitionSeconds < 0.0f
        ? DefaultTransitionSeconds
        : FMath::Max(0.0f, TransitionSeconds);

    if (CurrentWeather == NewState && FMath::IsNearlyEqual(CurrentTransitionSeconds, SafeTransition))
    {
        return true;
    }

    CurrentWeather = NewState;
    CurrentTransitionSeconds = SafeTransition;
    ForceNetUpdate();
    BroadcastWeatherPresentation();
    return true;
}

void AThreeBWeatherDirector::OnRep_WeatherState()
{
    BroadcastWeatherPresentation();
}

void AThreeBWeatherDirector::HandleStoryStateChanged(FThreeBReplicatedStoryState StoryState)
{
    if (!HasAuthority() || !WeatherProfile || !StoryState.WorldStateTag.IsValid())
    {
        return;
    }

    EThreeBWeatherState OverrideState = CurrentWeather;
    if (WeatherProfile->FindWorldStateOverride(StoryState.WorldStateTag, OverrideState))
    {
        SetWeatherState(OverrideState);
    }
}

void AThreeBWeatherDirector::BroadcastWeatherPresentation()
{
    OnWeatherChanged.Broadcast(CurrentWeather, CurrentTransitionSeconds);
    ApplyWeatherPresentation(CurrentWeather, CurrentTransitionSeconds);
}
