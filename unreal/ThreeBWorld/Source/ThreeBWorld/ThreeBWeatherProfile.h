#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "GameplayTagContainer.h"
#include "ThreeBWeatherProfile.generated.h"

UENUM(BlueprintType)
enum class EThreeBWeatherState : uint8
{
    Clear,
    GoldenClear,
    HighCloud,
    LowCloud,
    LightRain,
    HeavyRain,
    Storm,
    PostRain
};

USTRUCT(BlueprintType)
struct FThreeBWeatherStateDefinition
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    EThreeBWeatherState State = EThreeBWeatherState::Clear;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName Visibility;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, meta=(ClampMin="0.0", ClampMax="1.0"))
    float Wetness = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName Wind;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName Clouds;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName Rain;
};

USTRUCT(BlueprintType)
struct FThreeBAltitudeEnvironmentProfile
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName AltitudeBandId;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName Wind;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName Fog;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName AudioProfile;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName CloudRelation;
};

UCLASS(BlueprintType)
class THREEBWORLD_API UThreeBWeatherProfile : public UPrimaryDataAsset
{
    GENERATED_BODY()

public:
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="3B|Weather")
    FName ProfileId;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="3B|Weather")
    EThreeBWeatherState DefaultState = EThreeBWeatherState::LowCloud;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="3B|Weather")
    TArray<FThreeBWeatherStateDefinition> States;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="3B|Weather")
    TArray<FThreeBAltitudeEnvironmentProfile> AltitudeProfiles;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="3B|Weather")
    TMap<FGameplayTag, EThreeBWeatherState> WorldStateOverrides;

    UFUNCTION(BlueprintPure, Category="3B|Weather")
    bool FindState(EThreeBWeatherState State, FThreeBWeatherStateDefinition& OutState) const;

    UFUNCTION(BlueprintPure, Category="3B|Weather")
    bool FindWorldStateOverride(FGameplayTag WorldStateTag, EThreeBWeatherState& OutState) const;

    UFUNCTION(BlueprintPure, Category="3B|Weather")
    bool ValidateProfile(TArray<FString>& OutErrors) const;
};
