import random
import string

from django.db import migrations, models


def generate_codigos(apps, schema_editor):
    Sale = apps.get_model('sales', 'Sale')
    used = set()
    for sale in Sale.objects.filter(codigo=''):
        while True:
            code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=7))
            if code not in used:
                used.add(code)
                sale.codigo = code
                sale.save(update_fields=['codigo'])
                break


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0002_initial'),
    ]

    operations = [
        # Step 1: add nullable (no unique yet) so existing rows get the column
        migrations.AddField(
            model_name='sale',
            name='codigo',
            field=models.CharField(blank=True, editable=False, max_length=10, default=''),
            preserve_default=False,
        ),
        # Step 2: backfill existing rows
        migrations.RunPython(generate_codigos, migrations.RunPython.noop),
        # Step 3: add the unique constraint now that all rows have a value
        migrations.AlterField(
            model_name='sale',
            name='codigo',
            field=models.CharField(blank=True, editable=False, max_length=10, unique=True),
        ),
    ]
