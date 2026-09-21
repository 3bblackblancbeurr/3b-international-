#include "ThreeBGameInstance.h"

#include "GenericPlatform/GenericPlatformHttp.h"
#include "HAL/PlatformMisc.h"
#include "Misc/CommandLine.h"
#include "Misc/Guid.h"
#include "Misc/Parse.h"
#include "ThreeBWorldBridgeSubsystem.h"

FString UThreeBGameInstance::QueryValue(const FString& Url, const FString& Key)
{
    FString Left;
    FString Query;
    if (!Url.Split(TEXT("?"), &Left, &Query))
    {
        return FString();
    }

    TArray<FString> Pairs;
    Query.ParseIntoArray(Pairs, TEXT("&"), true);
    for (const FString& Pair : Pairs)
    {
        FString Name;
        FString Value;
        if (Pair.Split(TEXT("="), &Name, &Value) && Name.Equals(Key, ESearchCase::IgnoreCase))
        {
            return FGenericPlatformHttp::UrlDecode(Value);
        }
    }

    return FString();
}

void UThreeBGameInstance::Init()
{
    Super::Init();

    FString Ticket;
    FString ApiBase = DefaultApiBase;
    FParse::Value(FCommandLine::Get(), TEXT("ThreeBTicket="), Ticket);

    FString LaunchUrl;
    if (FParse::Value(FCommandLine::Get(), TEXT("ThreeBLaunchUrl="), LaunchUrl))
    {
        if (Ticket.IsEmpty())
        {
            Ticket = QueryValue(LaunchUrl, TEXT("ticket"));
        }

        const FString UrlApi = QueryValue(LaunchUrl, TEXT("api"));
        if (!UrlApi.IsEmpty())
        {
            ApiBase = UrlApi;
        }
    }

    if (Ticket.IsEmpty())
    {
        return;
    }

    UThreeBWorldBridgeSubsystem* Bridge = GetSubsystem<UThreeBWorldBridgeSubsystem>();
    if (!Bridge)
    {
        return;
    }

    Bridge->ConfigureApiBase(ApiBase);

    FString DeviceId = FPlatformMisc::GetDeviceId();
    if (DeviceId.IsEmpty())
    {
        DeviceId = FGuid::NewGuid().ToString(EGuidFormats::DigitsWithHyphensLower);
    }

    Bridge->RedeemLaunchTicket(Ticket, DeviceId);
}
