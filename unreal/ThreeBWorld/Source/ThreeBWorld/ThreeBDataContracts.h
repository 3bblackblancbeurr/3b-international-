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


USTRUCT(BlueprintType)
struct FThreeBSeasonSnapshot
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString Code;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString Label;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    double XpMultiplier = 1.0;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    double CoinsMultiplier = 1.0;
};

USTRUCT(BlueprintType)
struct FThreeBEconomySnapshot
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    int64 Xp = 0;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    int64 Coins = 0;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    int32 GlobalLevel = 1;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    int64 NextLevelXp = -1;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    int32 PrestigeLevel = 0;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString Title;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString EconomyVersion;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString XpCurveVersion;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FThreeBSeasonSnapshot Season;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    bool HasSeason = false;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    bool TokenEnabled = false;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    bool TokenBlockchainEnabled = false;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    bool TokenTradingEnabled = false;
};

USTRUCT(BlueprintType)
struct FThreeBWorldBootstrap
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString UserId;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FThreeBPassportIdentity Passport;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FThreeBEconomySnapshot Economy;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FThreeBWorldProgress World;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FThreeBCitySnapshot City;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    bool HasPassport = false;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    bool HasEconomy = false;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    bool HasWorldSave = false;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    bool HasCity = false;
};
