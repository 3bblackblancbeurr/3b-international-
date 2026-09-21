#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "ThreeBWeatherProfile.h"
#include "ThreeBWeatherDirector.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(
    FThreeBWeatherChanged,
    EThreeBWeatherState, WeatherState,
    float, TransitionSeconds
);

UCLASS(Blueprintable)
class THREEBWORLD_API AThreeBWeatherDirector : public AActor
{
    GENERATED_BODY()

public:
    AThreeBWeatherDirector();

    virtual void GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const override;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="3B|Weather")
    TObjectPtr<UThreeBWeatherProfile> WeatherProfile;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="3B|Weather", meta=(ClampMin="0.0"))
    float DefaultTransitionSeconds = 8.0f;

    UPROPERTY(BlueprintAssignable, Category="3B|Weather")
    FThreeBWeatherChanged OnWeatherChanged;

    UFUNCTION(BlueprintPure, Category="3B|Weather")
    EThreeBWeatherState GetWeatherState() const { return CurrentWeather; }

    UFUNCTION(BlueprintCallable, BlueprintAuthorityOnly, Category="3B|Weather")
    bool SetWeatherState(EThreeBWeatherState NewState, float TransitionSeconds = -1.0f);

protected:
    virtual void BeginPlay() override;

    UPROPERTY(ReplicatedUsing=OnRep_WeatherState, BlueprintReadOnly, Category="3B|Weather")
    EThreeBWeatherState CurrentWeather = EThreeBWeatherState::LowCloud;

    UPROPERTY(Replicated, BlueprintReadOnly, Category="3B|Weather")
    float CurrentTransitionSeconds = 0.0f;

    UFUNCTION()
    void OnRep_WeatherState();

    UFUNCTION(BlueprintImplementableEvent, Category="3B|Weather")
    void ApplyWeatherPresentation(EThreeBWeatherState WeatherState, float TransitionSeconds);

private:
    void BroadcastWeatherPresentation();
};
