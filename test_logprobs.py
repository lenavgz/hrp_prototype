# test_logprobs.py (FIXED)

from ollama import Client

client = Client()

print("[Test] Generiere mit logprobs...")

response = client.generate(
    model="llama3.2",
    prompt="Der Himmel ist",
    options={'num_predict': 1},
    stream=False
)

print("\n=== RESPONSE OBJECT ===")
print(f"Type: {type(response)}")
print(f"Response object attributes: {dir(response)}")

print("\n=== VALUES ===")
print(f"Model: {response.model}")
print(f"Generated text: '{response.response}'")

print("\n=== CHECK FOR LOGPROBS ===")
if hasattr(response, 'logprobs'):
    print("✅ Logprobs Attribute existiert!")
    print(f"Logprobs: {response.logprobs}")
    print(f"Type: {type(response.logprobs)}")
else:
    print("❌ Keine logprobs Attribute")
    print(f"Verfügbare Attributes: {[attr for attr in dir(response) if not attr.startswith('_')]}")