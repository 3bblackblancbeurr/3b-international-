#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "ThreeBRegionDefinition.generated.h"

class UThreeBMissionCatalog;
class UThreeBPopulationDefinition;
class UThreeBWeatherProfile;

USTRUCT(BlueprintType)
struct FThreeBAltitudeBandDefinition
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName Id;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    float HeightCm = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FText Purpose;
};

USTRUCT(BlueprintType)
struct FThreeBDistrictDefinition
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName Id;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FText DisplayName;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName AltitudeBandId;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName DataLayerName;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FVector AnchorLocation = FVector::ZeroVector;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, meta=(ClampMin="0"))
    int32 PopulationBudget = 0;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, meta=(MultiLine=true))
    FText VisualRule;
};

USTRUCT(BlueprintType)
struct FThreeBHydrologyLinkDefinition
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName Id;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName FromNode;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName ToNode;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName Kind;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    bool bGameplayCritical = false;
};

USTRUCT(BlueprintType)
struct FThreeBVistaDefinition
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName Id;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FVector Location = FVector::ZeroVector;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FVector Target = FVector::ZeroVector;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    TArray<FName> RequiredVisibleAltitudeBands;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName LandmarkId;
};

USTRUCT(BlueprintType)
struct FThreeBRegionStreamingProfile
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly, meta=(ClampMin="1000"))
    int32 TargetCellCm = 12000;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, meta=(ClampMin="1"))
    int32 DesktopInitialActiveCellsMax = 6;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, meta=(ClampMin="0"))
    int32 ActiveAiControllerBudget = 48;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    TArray<FName> AlwaysVisibleProxyIds;
};

UCLASS(BlueprintType)
class THREEBWORLD_API UThreeBRegionDefinition : public UPrimaryDataAsset
{
    GENERATED_BODY()

public:
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="3B|Region")
    FName RegionId;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="3B|Region")
    int32 SchemaVersion = 1;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="3B|Region")
    TArray<FThreeBAltitudeBandDefinition> AltitudeBands;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="3B|Region")
    TArray<FThreeBDistrictDefinition> Districts;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="3B|Region")
    TArray<FThreeBHydrologyLinkDefinition> HydrologyLinks;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="3B|Region")
    TArray<FThreeBVistaDefinition> Vistas;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="3B|Region")
    FThreeBRegionStreamingProfile Streaming;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="3B|Region|Runtime")
    TSoftObjectPtr<UThreeBMissionCatalog> MissionCatalog;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="3B|Region|Runtime")
    TSoftObjectPtr<UThreeBPopulationDefinition> PopulationDefinition;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="3B|Region|Runtime")
    TSoftObjectPtr<UThreeBWeatherProfile> WeatherProfile;

    UFUNCTION(BlueprintPure, Category="3B|Region")
    bool FindAltitudeBand(FName Id, FThreeBAltitudeBandDefinition& OutBand) const;

    UFUNCTION(BlueprintPure, Category="3B|Region")
    bool FindDistrict(FName Id, FThreeBDistrictDefinition& OutDistrict) const;

    UFUNCTION(BlueprintPure, Category="3B|Region")
    bool FindVista(FName Id, FThreeBVistaDefinition& OutVista) const;

    UFUNCTION(BlueprintPure, Category="3B|Region")
    bool ValidateDefinition(TArray<FString>& OutErrors) const;
};
