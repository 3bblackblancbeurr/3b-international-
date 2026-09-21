#include "ThreeBRegionDefinition.h"

bool UThreeBRegionDefinition::FindAltitudeBand(FName Id, FThreeBAltitudeBandDefinition& OutBand) const
{
    for (const FThreeBAltitudeBandDefinition& Band : AltitudeBands)
    {
        if (Band.Id == Id)
        {
            OutBand = Band;
            return true;
        }
    }
    return false;
}

bool UThreeBRegionDefinition::FindDistrict(FName Id, FThreeBDistrictDefinition& OutDistrict) const
{
    for (const FThreeBDistrictDefinition& District : Districts)
    {
        if (District.Id == Id)
        {
            OutDistrict = District;
            return true;
        }
    }
    return false;
}

bool UThreeBRegionDefinition::FindVista(FName Id, FThreeBVistaDefinition& OutVista) const
{
    for (const FThreeBVistaDefinition& Vista : Vistas)
    {
        if (Vista.Id == Id)
        {
            OutVista = Vista;
            return true;
        }
    }
    return false;
}

bool UThreeBRegionDefinition::ValidateDefinition(TArray<FString>& OutErrors) const
{
    OutErrors.Reset();

    if (RegionId.IsNone())
    {
        OutErrors.Add(TEXT("RegionId is required."));
    }

    TSet<FName> BandIds;
    for (const FThreeBAltitudeBandDefinition& Band : AltitudeBands)
    {
        if (Band.Id.IsNone())
        {
            OutErrors.Add(TEXT("Altitude band with empty Id."));
            continue;
        }
        if (BandIds.Contains(Band.Id))
        {
            OutErrors.Add(FString::Printf(TEXT("Duplicate altitude band: %s"), *Band.Id.ToString()));
        }
        BandIds.Add(Band.Id);
    }

    TSet<FName> DistrictIds;
    for (const FThreeBDistrictDefinition& District : Districts)
    {
        if (District.Id.IsNone())
        {
            OutErrors.Add(TEXT("District with empty Id."));
            continue;
        }
        if (DistrictIds.Contains(District.Id))
        {
            OutErrors.Add(FString::Printf(TEXT("Duplicate district: %s"), *District.Id.ToString()));
        }
        DistrictIds.Add(District.Id);

        if (!District.AltitudeBandId.IsNone() && !BandIds.Contains(District.AltitudeBandId))
        {
            OutErrors.Add(FString::Printf(
                TEXT("District %s references unknown altitude band %s."),
                *District.Id.ToString(),
                *District.AltitudeBandId.ToString()
            ));
        }
    }

    TSet<FName> VistaIds;
    for (const FThreeBVistaDefinition& Vista : Vistas)
    {
        if (Vista.Id.IsNone())
        {
            OutErrors.Add(TEXT("Vista with empty Id."));
            continue;
        }
        if (VistaIds.Contains(Vista.Id))
        {
            OutErrors.Add(FString::Printf(TEXT("Duplicate vista: %s"), *Vista.Id.ToString()));
        }
        VistaIds.Add(Vista.Id);

        for (const FName BandId : Vista.RequiredVisibleAltitudeBands)
        {
            if (!BandIds.Contains(BandId))
            {
                OutErrors.Add(FString::Printf(
                    TEXT("Vista %s references unknown altitude band %s."),
                    *Vista.Id.ToString(),
                    *BandId.ToString()
                ));
            }
        }
    }

    return OutErrors.IsEmpty();
}
