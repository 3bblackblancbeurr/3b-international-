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

    BroadcastWeatherPresentation();
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

void AThreeBWeatherDirector::BroadcastWeatherPresentation()
{
    OnWeatherChanged.Broadcast(CurrentWeather, CurrentTransitionSeconds);
    ApplyWeatherPresentation(CurrentWeather, CurrentTransitionSeconds);
}
