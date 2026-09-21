#include "ThreeBGameInstance.h"

#include "GenericPlatform/GenericPlatformHttp.h"
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
    FParse::Value(FCommandLine::Get(), TEXT("ThreeBTicket="), Ticket);

    FString LaunchUrl;
    if (FParse::Value(FCommandLine::Get(), TEXT("ThreeBLaunchUrl="), LaunchUrl) && Ticket.IsEmpty())
    {
        Ticket = QueryValue(LaunchUrl, TEXT("ticket"));
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

    // The API origin is trusted application configuration, never a deep-link parameter.
    // A crafted threebworld:// URL must not be able to redirect a one-time launch ticket.
    Bridge->ConfigureApiBase(DefaultApiBase);

    // This is deliberately ephemeral. Supabase user_id is the player identity;
    // the native bridge does not need a stable hardware identifier.
    const FString ClientInstanceId = FGuid::NewGuid().ToString(EGuidFormats::DigitsWithHyphensLower);
    Bridge->RedeemLaunchTicket(Ticket, ClientInstanceId);
}
