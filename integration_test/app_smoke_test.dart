import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:justice_companion/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('app launches to login screen', (tester) async {
    app.main();

    await tester.pump();
    await tester.pump(const Duration(seconds: 2));

    expect(find.text('Welcome Back'), findsOneWidget);
  });
}
