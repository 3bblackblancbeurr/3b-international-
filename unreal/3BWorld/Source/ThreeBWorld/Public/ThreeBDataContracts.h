#pragma once

#include "CoreMinimal.h"
#include "ThreeBDataContracts.generated.h"

USTRUCT(BlueprintType)
struct FThreeBPassportIdentity
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString UserId;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString DisplayName;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString Handle;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString Country;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString PassportId;
};

USTRUCT(BlueprintType)
struct FThreeBCityPlacement
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString PlacementId;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString BuildingCode;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    int32 X = 0;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    int32 Z = 0;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    int32 Rotation = 0;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    int32 UpgradeLevel = 1;
};

USTRUCT(BlueprintType)
struct FThreeBCitySnapshot
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString CityId;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString Name;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString OriginCountry;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    int32 CityLevel = 1;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    TArray<FThreeBCityPlacement> Placements;
};

USTRUCT(BlueprintType)
struct FThreeBWorldProgress
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString Region = TEXT("hub");

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    TArray<FString> VisitedCountries;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    TArray<FString> Souvenirs;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    TArray<FString> Seals;
};
